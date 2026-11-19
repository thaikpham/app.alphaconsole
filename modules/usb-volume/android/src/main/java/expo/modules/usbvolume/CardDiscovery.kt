package expo.modules.usbvolume

import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.storage.StorageManager
import android.os.storage.StorageVolume
import android.provider.DocumentsContract
import android.util.Log
import androidx.documentfile.provider.DocumentFile
import java.io.File

/** The camera card as the app can reach it: its volume UUID and the backend that reads it. */
internal class CardHandle(val uuid: String, val io: CardIo)

/** A card-sized removable volume that is mounted. [storage] is the system object, used to open the picker. */
internal class CardVolume(val uuid: String, val dir: File, val storage: StorageVolume)

/**
 * Finds the camera card. With all-files access the card is read as a file path under /storage/<uuid>/.
 * Without it, the card is read through the SAF tree the user granted for that volume's UUID.
 */
internal object CardDiscovery {
    private const val PREFS = "acl"
    private const val TAG = "UsbVolume"

    fun hasAllFilesAccess(): Boolean = Build.VERSION.SDK_INT >= 30 && Environment.isExternalStorageManager()

    /** Mounted removable volumes that have a UUID and a directory, in StorageManager order. */
    fun cardVolumes(ctx: Context): List<CardVolume> {
        if (Build.VERSION.SDK_INT < 30) return emptyList()
        val sm = ctx.getSystemService(Context.STORAGE_SERVICE) as StorageManager
        return sm.storageVolumes.mapNotNull { v ->
            val uuid = v.uuid ?: return@mapNotNull null
            val dir = v.directory ?: return@mapNotNull null
            if (v.isRemovable && v.state == Environment.MEDIA_MOUNTED) CardVolume(uuid, dir, v) else null
        }
    }

    /** Saves the grant for the volume the user picked. Returns that volume's UUID. */
    fun saveGrant(ctx: Context, uri: Uri): String {
        val uuid = DocumentsContract.getTreeDocumentId(uri).substringBefore(':')
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(grantKey(uuid), uri.toString()).apply()
        return uuid
    }

    /** Slot 1 for the attached camera, or null. Logs every card-sized candidate so a wrong pick can be traced. */
    fun resolveSlot1(ctx: Context): CardHandle? {
        val probes = ArrayList<VolumeProbe<CardIo>>()
        for (v in cardVolumes(ctx)) {
            val io = backendFor(ctx, v)
            if (io == null) {
                Log.i(TAG, "volume ${v.uuid}: no access yet, not probed")
                continue
            }
            val sony = runCatching { io.exists(SONYCARD) }.getOrDefault(false)
            probes.add(VolumeProbe(v.uuid, sony, aclTimed("statfs ${v.uuid}") { totalBytes(v.dir) }, io))
        }
        Log.i(TAG, "card candidates: " + probes.joinToString { "${it.uuid}(sony=${it.sonyCard}, bytes=${it.totalBytes})" })
        return pickSlot1(probes)?.let { CardHandle(it.uuid, it.handle) }
    }

    /** The first card-sized volume without a grant. The folder picker opens at its root. Null when every card has one. */
    fun ungrantedCardVolume(ctx: Context): CardVolume? {
        val volumes = cardVolumes(ctx)
        Log.i(TAG, "picker candidates: " + volumes.joinToString {
            "${it.uuid}(granted=${grantedTree(ctx, it.uuid) != null}, bytes=${totalBytes(it.dir)})"
        })
        return volumes.firstOrNull { grantedTree(ctx, it.uuid) == null && totalBytes(it.dir) >= MIN_CARD_BYTES }
    }

    /** File access when all-files access is granted, else the SAF grant for the volume. Null when neither exists. */
    private fun backendFor(ctx: Context, volume: CardVolume): CardIo? {
        if (hasAllFilesAccess()) return timedIo(FileBackend(volume.dir), "file")
        val tree = grantedTree(ctx, volume.uuid) ?: return null
        val root = DocumentFile.fromTreeUri(ctx, tree) ?: return null
        return timedIo(SafBackend(ctx, root), "saf")
    }

    /** The grant saved for this UUID, if the system still holds it. */
    private fun grantedTree(ctx: Context, uuid: String): Uri? {
        val saved = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(grantKey(uuid), null) ?: return null
        val uri = Uri.parse(saved)
        val held = ctx.contentResolver.persistedUriPermissions.any {
            it.uri == uri && it.isReadPermission && it.isWritePermission
        }
        return if (held) uri else null
    }

    private fun grantKey(uuid: String): String = "grant:$uuid"

    private fun totalBytes(dir: File): Long = runCatching { StatFs(dir.path).totalBytes }.getOrDefault(0L)
}
