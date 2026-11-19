package com.alphacolorlab.spike

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.storage.StorageManager
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.ScrollView
import android.widget.TextView
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class MainActivity : Activity() {

    companion object {
        private const val ACTION_USB_PERMISSION = "com.alphacolorlab.spike.USB_PERMISSION"
        private const val REQ_PICK_TREE = 1001
    }

    private lateinit var logView: TextView
    private lateinit var logScroll: ScrollView
    private lateinit var preview: ImageView
    private lateinit var previewFrame: View
    private lateinit var btnLiveView: Button

    private val pool = Executors.newCachedThreadPool()
    private val usb: UsbManager by lazy { getSystemService(Context.USB_SERVICE) as UsbManager }
    @Volatile private var ptp: PtpDevice? = null
    @Volatile private var permissionAction: ((UsbDevice) -> Unit)? = null
    private val lvRunning = AtomicBoolean(false)

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    val d = usbDeviceExtra(intent)
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    AclLog.i("USB permission for ${d?.deviceName} granted=$granted")
                    val action = permissionAction
                    permissionAction = null
                    if (d != null && granted && action != null) bg("permissionAction") { action(d) }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> usbDeviceExtra(intent)?.let { describeDevice(it) }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val d = usbDeviceExtra(intent)
                    AclLog.i("USB detached ${d?.deviceName}")
                    if (d != null && d.vendorId == SONY_VID) {
                        stopLiveView()
                        closePtp()
                    }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        AclLog.init(this)
        logView = findViewById(R.id.log)
        logScroll = findViewById(R.id.logScroll)
        preview = findViewById(R.id.preview)
        previewFrame = findViewById(R.id.previewFrame)
        btnLiveView = findViewById(R.id.btnLiveView)
        AclLog.sink = { line -> runOnUiThread { appendLog(line) } }

        previewFrame.post {
            previewFrame.layoutParams = previewFrame.layoutParams.apply { height = previewFrame.width * 9 / 16 }
        }

        findViewById<Button>(R.id.btnVolumes).setOnClickListener { volumes() }
        findViewById<Button>(R.id.btnPickCard).setOnClickListener { pickCard() }
        findViewById<Button>(R.id.btnWriteHybrid).setOnClickListener { bg("writeHybrid") { CardOps.writeHybrid(this) } }
        findViewById<Button>(R.id.btnRestore).setOnClickListener { bg("restore") { CardOps.restoreLatest(this) } }
        findViewById<Button>(R.id.btnExif).setOnClickListener {
            bg("exif") { CardOps.exifNewest(this) { bmp -> runOnUiThread { preview.setImageBitmap(bmp) } } }
        }
        findViewById<Button>(R.id.btnPtpConnect).setOnClickListener { ptpConnect() }
        findViewById<Button>(R.id.btnPtpProps).setOnClickListener { ptpProps() }
        btnLiveView.setOnClickListener { toggleLiveView() }
        findViewById<Button>(R.id.btnCamera2).setOnClickListener { bg("camera2") { camera2() } }
        findViewById<Button>(R.id.btnClear).setOnClickListener {
            AclLog.clear()
            logView.text = ""
        }

        registerUsbReceiver()
        logUsbIntent(intent)
        AclLog.i("ACL Spike started; log file dir: ${appDir(this).path}")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        logUsbIntent(intent)
    }

    override fun onDestroy() {
        unregisterReceiver(usbReceiver)
        stopLiveView()
        closePtp()
        AclLog.sink = null
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_PICK_TREE) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) {
            AclLog.i("tree pick cancelled")
            return
        }
        contentResolver.takePersistableUriPermission(
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
        )
        CardOps.saveTree(this, uri)
        AclLog.i("card tree saved: $uri")
        bg("inspect") { CardOps.inspect(this) }
    }

    private fun appendLog(line: String) {
        logView.append(line + "\n")
        logScroll.post { logScroll.fullScroll(View.FOCUS_DOWN) }
    }

    /** Runs [block] off the UI thread; any exception is logged. */
    private fun bg(name: String, block: () -> Unit) {
        pool.execute {
            try {
                block()
            } catch (e: Exception) {
                AclLog.ex(name, e)
            }
        }
    }

    private fun ptpDir(): File = File(appDir(this), "ptp")

    private fun registerUsbReceiver() {
        val f = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(usbReceiver, f, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(usbReceiver, f)
        }
    }

    @Suppress("DEPRECATION")
    private fun usbDeviceExtra(intent: Intent): UsbDevice? =
        if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        }

    private fun logUsbIntent(i: Intent?) {
        if (i != null && i.action == UsbManager.ACTION_USB_DEVICE_ATTACHED) {
            AclLog.i("launched by USB attach: ${usbDeviceExtra(i)?.deviceName}")
        }
    }

    private fun describeDevice(d: UsbDevice) {
        AclLog.i("USB ${"%04X:%04X".format(d.vendorId, d.productId)} name=${d.deviceName} ifs=${d.interfaceCount} perm=${usb.hasPermission(d)}")
    }

    private fun volumes() {
        AclLog.i("--- volumes ---")
        if (Build.VERSION.SDK_INT >= 30) {
            val sm = getSystemService(Context.STORAGE_SERVICE) as StorageManager
            for (v in sm.storageVolumes) {
                AclLog.i("vol '${v.getDescription(this)}' state=${v.state} removable=${v.isRemovable} primary=${v.isPrimary} uuid=${v.uuid} dir=${v.directory?.path}")
            }
        } else {
            AclLog.i("storageVolumes needs API 30 (device is ${Build.VERSION.SDK_INT})")
        }
        for (d in usb.deviceList.values) {
            describeDevice(d)
            val serial = try {
                d.serialNumber
            } catch (e: SecurityException) {
                "(needs permission)"
            }
            AclLog.i("  serial=$serial")
            for (i in 0 until d.interfaceCount) {
                val itf = d.getInterface(i)
                AclLog.i("  IF#${itf.id} class=${itf.interfaceClass} sub=${itf.interfaceSubclass} proto=${itf.interfaceProtocol} eps=${itf.endpointCount}")
            }
        }
    }

    private fun pickCard() {
        val intent: Intent
        if (Build.VERSION.SDK_INT >= 30) {
            val sm = getSystemService(Context.STORAGE_SERVICE) as StorageManager
            val vol = sm.storageVolumes.firstOrNull { it.isRemovable && it.state == android.os.Environment.MEDIA_MOUNTED }
            if (vol == null) {
                AclLog.i("no mounted removable volume; connect the camera in Mass Storage mode or insert the card")
                return
            }
            AclLog.i("opening picker on '${vol.getDescription(this)}'")
            intent = vol.createOpenDocumentTreeIntent()
        } else {
            intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        }
        @Suppress("DEPRECATION")
        startActivityForResult(intent, REQ_PICK_TREE)
    }

    /** Runs [action] on the Sony device, requesting USB permission first when needed. */
    private fun withSonyDevice(action: (UsbDevice) -> Unit) {
        val dev = usb.deviceList.values.firstOrNull { it.vendorId == SONY_VID }
        if (dev == null) {
            AclLog.i("no Sony USB device (VID 054C) attached")
            return
        }
        if (usb.hasPermission(dev)) {
            bg("ptpAction") { action(dev) }
            return
        }
        AclLog.i("requesting USB permission for ${dev.deviceName}")
        permissionAction = action
        usb.requestPermission(dev, permissionIntent())
    }

    private fun permissionIntent(): PendingIntent {
        val flags = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
        val intent = Intent(ACTION_USB_PERMISSION).setPackage(packageName)
        return PendingIntent.getBroadcast(this, 0, intent, flags)
    }

    private fun ptpConnect() {
        withSonyDevice { dev ->
            closePtp()
            val d = PtpDevice.open(usb, dev)
            ptp = d
            d.connectSequence(ptpDir())
        }
    }

    private fun ptpProps() {
        val d = ptp
        if (d == null) {
            AclLog.i("PTP not connected; press 'PTP: kết nối' first")
            return
        }
        bg("ptpProps") { d.readAllProps(ptpDir(), AclLog.stamp()) }
    }

    private fun closePtp() {
        val d = ptp ?: return
        ptp = null
        d.close()
    }

    private fun toggleLiveView() {
        if (lvRunning.get()) {
            stopLiveView()
            return
        }
        val d = ptp
        if (d == null) {
            AclLog.i("PTP not connected; press 'PTP: kết nối' first")
            return
        }
        lvRunning.set(true)
        btnLiveView.text = "Live view ■"
        bg("liveView") { liveViewLoop(d) }
    }

    private fun stopLiveView() {
        lvRunning.set(false)
    }

    private fun liveViewLoop(d: PtpDevice) {
        try {
            val info = d.transact(Ptp.OP_GET_OBJECT_INFO, intArrayOf(Ptp.LV_HANDLE))
            AclLog.i("GetObjectInfo(LV) resp=${Ptp.hex16(info.code)}")
            if (info.code == Ptp.RC_LIVE_VIEW_NOT_ENABLED) {
                AclLog.i("live view not enabled on the camera; stopping")
                return
            }
            var frames = 0
            var fpsFrames = 0
            var fpsSince = System.currentTimeMillis()
            var failures = 0
            while (lvRunning.get()) {
                val t0 = System.currentTimeMillis()
                val r = d.liveViewGet()
                if (r.code == Ptp.RC_LIVE_VIEW_NOT_ENABLED) {
                    AclLog.i("live view turned off on the camera; stopping")
                    return
                }
                val jpg = if (r.code == Ptp.RC_OK) PtpCodec.liveViewJpeg(r.data) else null
                if (jpg == null) {
                    failures++
                    if (failures % 20 == 1) AclLog.i("LV frame not ready resp=${Ptp.hex16(r.code)} (failures=$failures)")
                    Thread.sleep(200)
                    continue
                }
                val bmp = BitmapFactory.decodeByteArray(jpg, 0, jpg.size)
                if (bmp == null) {
                    AclLog.i("LV jpeg decode failed size=${jpg.size}")
                    Thread.sleep(200)
                    continue
                }
                if (frames == 0) {
                    ptpDir().mkdirs()
                    File(ptpDir(), "lv-first.jpg").writeBytes(jpg)
                    AclLog.i("first LV frame saved, ${jpg.size} bytes")
                }
                runOnUiThread { preview.setImageBitmap(bmp) }
                frames++
                fpsFrames++
                val now = System.currentTimeMillis()
                if (now - fpsSince >= 2000) {
                    AclLog.i("LV fps=${"%.1f".format(fpsFrames * 1000.0 / (now - fpsSince))} frames=$frames")
                    fpsSince = now
                    fpsFrames = 0
                }
                val spent = System.currentTimeMillis() - t0
                if (spent < 33) Thread.sleep(33 - spent)
            }
        } finally {
            lvRunning.set(false)
            runOnUiThread { btnLiveView.text = "Live view ▶" }
        }
    }

    private fun camera2() {
        if (Build.VERSION.SDK_INT >= 34) {
            AclLog.i("FEATURE_CAMERA_EXTERNAL=${packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_EXTERNAL)}")
        }
        val cm = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val ids = cm.cameraIdList
        if (ids.isEmpty()) AclLog.i("camera2: no cameras reported")
        for (id in ids) {
            val ch = cm.getCameraCharacteristics(id)
            val facing = ch.get(CameraCharacteristics.LENS_FACING)
            val label = when (facing) {
                CameraMetadata.LENS_FACING_FRONT -> "FRONT"
                CameraMetadata.LENS_FACING_BACK -> "BACK"
                CameraMetadata.LENS_FACING_EXTERNAL -> "EXTERNAL"
                else -> "?"
            }
            AclLog.i("camera2 id=$id facing=$label($facing) hwLevel=${ch.get(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL)}")
        }
    }
}
