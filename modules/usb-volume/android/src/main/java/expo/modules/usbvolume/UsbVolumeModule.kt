package expo.modules.usbvolume

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.net.Uri
import android.os.Build
import android.os.storage.StorageManager
import android.os.storage.StorageVolume
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File

private const val SONY_VID = 0x054C
private const val REQ_PICK_TREE = 0x5A10
private const val API_SAF_VOLUMES = 30

class FileInput : Record {
    @Field val relPath: String = ""
    @Field val base64: String = ""
}

class UsbVolumeModule : Module() {
    private var receiver: BroadcastReceiver? = null
    private var pendingPick: Promise? = null
    private val modeByDevice = HashMap<String, String>()
    private var volumeStorage: StorageManager? = null
    private var volumeCallback: StorageManager.StorageVolumeCallback? = null

    override fun definition() = ModuleDefinition {
        Name("UsbVolume")
        Events("usbAttached", "usbDetached", "writeProgress", "volumesChanged")

        OnCreate { registerUsbReceiver() }
        OnDestroy {
            unregisterUsbReceiver()
            stopVolumeWatch()
        }
        OnStartObserving("volumesChanged") { startVolumeWatch() }
        OnStopObserving("volumesChanged") { stopVolumeWatch() }
        OnActivityResult { _, payload ->
            if (payload.requestCode == REQ_PICK_TREE) handlePickResult(payload.resultCode, payload.data)
        }

        AsyncFunction("listVolumes") { aclTimed("listVolumes") { listVolumes() } }
        AsyncFunction("hasAllFilesAccess") { aclTimed("hasAllFilesAccess") { CardDiscovery.hasAllFilesAccess() } }
        AsyncFunction("openAllFilesAccessSettings") { aclTimed("openAllFilesAccessSettings") { openAllFilesAccessSettings() } }
        AsyncFunction("pickCardTree") { promise: Promise -> aclTimed("pickCardTree") { startPick(promise) } }
        AsyncFunction("getUsbState") { aclTimed("getUsbState") { usbState() } }
        AsyncFunction("isTreeAvailable") {
            aclTimed("isTreeAvailable") { CardDiscovery.resolveSlot1(requireContext()) != null }
        }
        AsyncFunction("inspectCard") { folder: String?, sonyModel: String? ->
            aclTimed("inspectCard") {
                guarded {
                    val card = requireCard()
                    val snap = aclTimed("inspectCard core") { inspectCard(card.io, folder, sonyModel) }
                    mapOf(
                        "sonyCard" to snap.sonyCard,
                        "uuid" to card.uuid,
                        "systemKind" to snap.systemKind,
                        "family" to snap.family,
                        "settingDir" to snap.settingDir,
                        "files" to snap.files.map(::fileMap),
                    )
                }
            }
        }
        AsyncFunction("writeFilesVerified") { files: List<FileInput>, backupId: String ->
            aclTimed("writeFilesVerified") {
                guarded {
                    val card = requireCard()
                    val outcome = CardWriter(card.io, backupStore()).writeVerified(
                        files.map { it.relPath to Base64.decode(it.base64, Base64.DEFAULT) },
                        backupId,
                    ) { relPath, status -> sendEvent("writeProgress", mapOf("relPath" to relPath, "status" to status)) }
                    mapOf(
                        "backupId" to outcome.backupId,
                        "ok" to outcome.ok,
                        "rolledBack" to outcome.rolledBack,
                        "results" to outcome.results.map(::outcomeMap),
                    )
                }
            }
        }
        AsyncFunction("listBackups") {
            aclTimed("listBackups") {
                guarded {
                    backupStore().list().map { mapOf("id" to it.id, "createdAt" to it.createdAt, "files" to it.files) }
                }
            }
        }
        AsyncFunction("readBackup") { id: String ->
            aclTimed("readBackup") {
                guarded {
                    val content = backupStore().content(id)
                    mapOf("id" to content.id, "files" to content.files.map(::fileMap))
                }
            }
        }
        AsyncFunction("restoreBackup") { id: String ->
            aclTimed("restoreBackup") {
                guarded {
                    val card = requireCard()
                    val outcome = CardWriter(card.io, backupStore()).restore(id)
                    mapOf(
                        "backupId" to outcome.backupId,
                        "ok" to outcome.ok,
                        "results" to outcome.results.map(::outcomeMap),
                    )
                }
            }
        }
    }

    private fun requireContext(): Context =
        appContext.reactContext ?: throw CodedException("E_NO_CONTEXT", "React context unavailable", null)

    private fun requireStorageVolumes(): StorageManager {
        if (Build.VERSION.SDK_INT < API_SAF_VOLUMES) {
            throw CodedException("E_API_LEVEL", "Card access needs Android 11 or newer", null)
        }
        return requireContext().getSystemService(Context.STORAGE_SERVICE) as StorageManager
    }

    /** The camera card for slot 1. Throws E_NO_TREE when no card is reachable yet. */
    private fun requireCard(): CardHandle =
        CardDiscovery.resolveSlot1(requireContext()) ?: throw CodedException("E_NO_TREE", "No camera card found", null)

    private fun backupStore(): BackupStore {
        val ctx = requireContext()
        return BackupStore(File(ctx.getExternalFilesDir(null) ?: ctx.filesDir, "backup"))
    }

    /** Turns a card error into a coded error for JS. Other exceptions pass through unchanged. */
    private inline fun <T> guarded(block: () -> T): T =
        try {
            block()
        } catch (e: CardError) {
            throw CodedException(e.code, e.message ?: e.code, e)
        }

    private fun listVolumes(): List<Map<String, Any?>> {
        val ctx = requireContext()
        return requireStorageVolumes().storageVolumes.map { v ->
            mapOf(
                "description" to v.getDescription(ctx),
                "removable" to v.isRemovable,
                "primary" to v.isPrimary,
                "state" to v.state,
            )
        }
    }

    /**
     * Opens the folder picker at the card's volume, for when all-files access is refused. Rejects with E_NO_VOLUME
     * when no card-sized volume lacks a grant yet, E_NO_ACTIVITY when the app is in the background.
     */
    @Suppress("DEPRECATION")
    private fun startPick(promise: Promise) {
        requireStorageVolumes()
        if (pendingPick != null) {
            promise.reject("E_BUSY", "A folder pick is already in progress", null)
            return
        }
        val activity = appContext.currentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No foreground activity", null)
            return
        }
        val card = CardDiscovery.ungrantedCardVolume(requireContext())
        if (card == null) {
            promise.reject("E_NO_VOLUME", "No card-sized removable volume without a grant", null)
            return
        }
        pendingPick = promise
        activity.startActivityForResult(card.storage.createOpenDocumentTreeIntent(), REQ_PICK_TREE)
    }

    private fun handlePickResult(resultCode: Int, data: Intent?) {
        val promise = pendingPick ?: return
        pendingPick = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            promise.reject("E_PICK_CANCELLED", "No folder chosen", null)
            return
        }
        try {
            val ctx = requireContext()
            ctx.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
            val uuid = CardDiscovery.saveGrant(ctx, uri)
            promise.resolve(mapOf("uri" to uri.toString(), "uuid" to uuid))
        } catch (e: Exception) {
            promise.reject("E_PICK_FAILED", e.message ?: e.toString(), e)
        }
    }

    /** Opens this app's "All files access" page in system settings. */
    private fun openAllFilesAccessSettings() {
        if (Build.VERSION.SDK_INT < API_SAF_VOLUMES) {
            throw CodedException("E_API_LEVEL", "All-files access needs Android 11 or newer", null)
        }
        val ctx = requireContext()
        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:${ctx.packageName}"))
        val activity = appContext.currentActivity
        if (activity != null) {
            activity.startActivity(intent)
        } else {
            ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    /** The Sony device currently attached, or null. */
    private fun usbState(): Map<String, Any?>? {
        val usb = requireContext().getSystemService(Context.USB_SERVICE) as UsbManager
        val device = usb.deviceList.values.firstOrNull { it.vendorId == SONY_VID } ?: return null
        return describe(device, modeOf(device))
    }

    private fun registerUsbReceiver() {
        val ctx = appContext.reactContext ?: return
        val r = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val i = intent ?: return
                val device = deviceExtra(i) ?: return
                if (device.vendorId != SONY_VID) return
                when (i.action) {
                    UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                        val mode = modeOf(device)
                        modeByDevice[device.deviceName] = mode
                        sendEvent("usbAttached", describe(device, mode))
                    }
                    UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                        val mode = modeByDevice.remove(device.deviceName) ?: modeOf(device)
                        sendEvent("usbDetached", describe(device, mode))
                    }
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            ctx.registerReceiver(r, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            ctx.registerReceiver(r, filter)
        }
        receiver = r
    }

    private fun unregisterUsbReceiver() {
        val r = receiver ?: return
        receiver = null
        appContext.reactContext?.unregisterReceiver(r)
    }

    /**
     * Sends "volumesChanged" when a removable volume is mounted, unmounted or removed. JS reads the card on each one, so
     * a card that Android mounts seconds after the USB attach is read as soon as it is there. Android 11+ only; older
     * versions send nothing and JS keeps its poll.
     */
    private fun startVolumeWatch() {
        if (volumeCallback != null || Build.VERSION.SDK_INT < API_SAF_VOLUMES) return
        val ctx = appContext.reactContext ?: return
        val storage = ctx.getSystemService(Context.STORAGE_SERVICE) as StorageManager
        val callback = object : StorageManager.StorageVolumeCallback() {
            override fun onStateChanged(volume: StorageVolume) {
                if (!volume.isRemovable) return
                sendEvent("volumesChanged", mapOf("state" to volume.state))
            }
        }
        storage.registerStorageVolumeCallback(ctx.mainExecutor, callback)
        volumeStorage = storage
        volumeCallback = callback
    }

    private fun stopVolumeWatch() {
        val storage = volumeStorage ?: return
        val callback = volumeCallback ?: return
        storage.unregisterStorageVolumeCallback(callback)
        volumeStorage = null
        volumeCallback = null
    }

    @Suppress("DEPRECATION")
    private fun deviceExtra(intent: Intent): UsbDevice? =
        if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        }

    /** Mass Storage when any interface is class 8, PTP when class 6. The PID is not used. */
    private fun modeOf(device: UsbDevice): String {
        var mode = "unknown"
        for (i in 0 until device.interfaceCount) {
            when (device.getInterface(i).interfaceClass) {
                UsbConstants.USB_CLASS_MASS_STORAGE -> return "mass-storage"
                UsbConstants.USB_CLASS_STILL_IMAGE -> mode = "ptp"
            }
        }
        return mode
    }

    private fun describe(device: UsbDevice, mode: String): Map<String, Any?> =
        mapOf("vendorId" to device.vendorId, "productId" to device.productId, "mode" to mode)

    private fun fileMap(f: CardFile): Map<String, Any?> =
        mapOf("name" to f.name, "size" to f.bytes.size, "base64" to Base64.encodeToString(f.bytes, Base64.NO_WRAP))

    private fun outcomeMap(r: FileOutcome): Map<String, Any?> =
        mapOf("relPath" to r.relPath, "ok" to r.ok, "error" to r.error)
}
