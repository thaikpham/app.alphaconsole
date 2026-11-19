package com.alphacolorlab.spike

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.IOException

/** SD card access through SAF. Every result goes to AclLog. */
object CardOps {
    private const val PREFS = "acl"
    private const val KEY_TREE = "tree_uri"

    const val SONYCARD = "PRIVATE/SONY/SONYCARD.IND"
    const val MEDIAPRO = "PRIVATE/M4ROOT/MEDIAPRO.XML"
    const val E10_DIR = "PRIVATE/SONY/SETTING/E10"
    const val OFF_315 = 0x315
    val HYBRID_NAMES = listOf("CAMPR01P.DAT", "CAMPR02P.DAT", "CAMPR03P.DAT", "CAMPR04P.DAT")

    // Format of MEDIAPRO.XML is unverified; the match is best-effort and logged.
    private val SYSTEM_KIND = Regex("""(?i)systemkind\W{1,4}([A-Za-z0-9_.-]+)""")

    private val EXIF_TAGS = listOf(
        ExifInterface.TAG_MAKE,
        ExifInterface.TAG_MODEL,
        ExifInterface.TAG_SOFTWARE,
        ExifInterface.TAG_DATETIME_ORIGINAL,
        ExifInterface.TAG_EXPOSURE_TIME,
        ExifInterface.TAG_F_NUMBER,
        ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY,
        ExifInterface.TAG_EXPOSURE_PROGRAM,
        ExifInterface.TAG_WHITE_BALANCE,
        ExifInterface.TAG_METERING_MODE,
        ExifInterface.TAG_FOCAL_LENGTH,
        ExifInterface.TAG_LENS_MODEL,
    )

    fun savedTree(ctx: Context): Uri? =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TREE, null)?.let { Uri.parse(it) }

    fun saveTree(ctx: Context, uri: Uri) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TREE, uri.toString()).apply()
    }

    fun root(ctx: Context): DocumentFile? = savedTree(ctx)?.let { DocumentFile.fromTreeUri(ctx, it) }

    private fun requireCard(ctx: Context): DocumentFile? {
        val root = root(ctx)
        if (root == null) {
            AclLog.i("no card folder chosen; press 'Chọn thẻ' first")
            return null
        }
        if (root.walk(SONYCARD) == null) {
            AclLog.i("THẺ CHƯA FORMAT TRONG MÁY (SONYCARD.IND not found)")
            return null
        }
        return root
    }

    fun inspect(ctx: Context) {
        val root = root(ctx)
        if (root == null) {
            AclLog.i("no card folder chosen; press 'Chọn thẻ' first")
            return
        }
        AclLog.i("root='${root.name}' canWrite=${root.canWrite()}")
        AclLog.i("SONYCARD.IND ${if (root.walk(SONYCARD) != null) "present" else "MISSING"}")
        val mp = root.walk(MEDIAPRO)
        if (mp == null) {
            AclLog.i("MEDIAPRO.XML missing")
        } else {
            val xml = readAll(ctx, mp.uri)?.toString(Charsets.UTF_8).orEmpty()
            val kind = SYSTEM_KIND.find(xml)?.groupValues?.get(1) ?: "(no match)"
            AclLog.i("MEDIAPRO systemKind=$kind size=${xml.length}")
        }
        val e10 = root.walk(E10_DIR)
        if (e10 == null) {
            AclLog.i("E10 dir missing")
            return
        }
        for (f in e10.listFiles()) {
            val b = readAll(ctx, f.uri)
            AclLog.i("  ${f.name} size=${f.length()} b315=${hexByte(b?.getOrNull(OFF_315))}")
        }
    }

    fun writeHybrid(ctx: Context) {
        val root = requireCard(ctx) ?: return
        val e10 = root.ensureDirs(E10_DIR) ?: run {
            AclLog.i("FAIL cannot create $E10_DIR")
            return
        }
        val existing = HYBRID_NAMES.mapNotNull { n -> e10.findFile(n)?.let { n to it } }
        if (existing.isNotEmpty()) {
            val dir = File(appDir(ctx), "backup/${AclLog.stamp()}")
            dir.mkdirs()
            for ((n, f) in existing) {
                val b = readAll(ctx, f.uri)
                if (b == null) {
                    AclLog.i("FAIL backup read $n")
                    continue
                }
                File(dir, n).writeBytes(b)
                AclLog.i("backed up $n size=${b.size} -> ${dir.path}")
            }
        } else {
            AclLog.i("no existing CAMPR files; nothing to back up")
        }
        var allOk = true
        for (n in HYBRID_NAMES) {
            val bytes = ctx.assets.open("e10/$n").use { it.readBytes() }
            allOk = putFile(ctx, e10, n, bytes) && allOk
        }
        AclLog.i(if (allOk) "Hybrid write: ALL OK" else "Hybrid write: FAILURES above")
    }

    fun restoreLatest(ctx: Context) {
        val root = requireCard(ctx) ?: return
        val e10 = root.ensureDirs(E10_DIR) ?: run {
            AclLog.i("FAIL cannot create $E10_DIR")
            return
        }
        val backupRoot = File(appDir(ctx), "backup")
        val latest = backupRoot.listFiles()
            ?.filter { it.isDirectory && it.listFiles()?.isNotEmpty() == true }
            ?.maxByOrNull { it.name }
        if (latest == null) {
            AclLog.i("no backup found under ${backupRoot.path}")
            return
        }
        AclLog.i("restoring from ${latest.path}")
        val files = latest.listFiles().orEmpty().filter { it.name in HYBRID_NAMES }
        if (files.isEmpty()) {
            AclLog.i("backup holds no CAMPR files")
            return
        }
        var allOk = true
        for (f in files) allOk = putFile(ctx, e10, f.name, f.readBytes()) && allOk
        AclLog.i(if (allOk) "restore: ALL OK" else "restore: FAILURES above")
    }

    /** Writes [bytes] as [name] in [dir], reads it back, and compares. */
    private fun putFile(ctx: Context, dir: DocumentFile, name: String, bytes: ByteArray): Boolean {
        val t0 = System.currentTimeMillis()
        return try {
            val existing = dir.findFile(name)
            val f = existing ?: dir.createFile("application/octet-stream", name)
            if (f == null) {
                AclLog.i("FAIL createFile($name) returned null")
                return false
            }
            if (f.name != name) {
                AclLog.i("FAIL provider named it '${f.name}', not '$name'; not writing")
                if (existing == null) f.delete()
                return false
            }
            val out = ctx.contentResolver.openOutputStream(f.uri, "wt")
                ?: throw IOException("openOutputStream returned null for $name")
            out.use { it.write(bytes) }
            val back = readAll(ctx, f.uri)
            val ok = back != null && back.contentEquals(bytes)
            val ms = System.currentTimeMillis() - t0
            AclLog.i("${if (ok) "OK" else "FAIL"} $name wrote=${bytes.size} read=${back?.size} b315=${hexByte(back?.getOrNull(OFF_315))} ${ms}ms")
            ok
        } catch (e: Exception) {
            AclLog.ex("putFile $name", e)
            false
        }
    }

    fun exifNewest(ctx: Context, onThumb: (Bitmap) -> Unit) {
        val root = root(ctx) ?: run {
            AclLog.i("no card folder chosen; press 'Chọn thẻ' first")
            return
        }
        val dcim = root.walk("DCIM") ?: run {
            AclLog.i("DCIM not found")
            return
        }
        val newest = dcim.listFiles().asSequence()
            .filter { it.isDirectory }
            .flatMap { it.listFiles().asSequence() }
            .filter { it.isFile && it.name?.endsWith(".JPG", ignoreCase = true) == true }
            .maxWithOrNull(compareBy<DocumentFile>({ it.lastModified() }, { it.name ?: "" }))
        if (newest == null) {
            AclLog.i("no JPG under DCIM")
            return
        }
        AclLog.i("newest ${newest.name} size=${newest.length()} modified=${newest.lastModified()}")
        val exif = ctx.contentResolver.openInputStream(newest.uri)?.use { ExifInterface(it) }
        if (exif == null) {
            AclLog.i("cannot open ${newest.name}")
            return
        }
        for (t in EXIF_TAGS) AclLog.i("  $t=${exif.getAttribute(t)}")
        val thumb = exif.thumbnailBytes
        val bmp = if (thumb != null) {
            BitmapFactory.decodeByteArray(thumb, 0, thumb.size)
        } else {
            AclLog.i("no EXIF thumbnail; decoding full image at inSampleSize 8")
            val opts = BitmapFactory.Options().apply { inSampleSize = 8 }
            ctx.contentResolver.openInputStream(newest.uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
        }
        if (bmp == null) AclLog.i("could not decode preview") else onThumb(bmp)
    }
}

private fun readAll(ctx: Context, uri: Uri): ByteArray? =
    ctx.contentResolver.openInputStream(uri)?.use { it.readBytes() }

private fun hexByte(b: Byte?): String =
    if (b == null) "n/a" else "0x%02X".format(b.toInt() and 0xFF)

/** Walks slash-separated [path] through existing children. Null if any segment is missing. */
private fun DocumentFile.walk(path: String): DocumentFile? {
    var cur: DocumentFile? = this
    for (seg in path.split('/').filter { it.isNotEmpty() }) cur = cur?.findFile(seg) ?: return null
    return cur
}

/** Creates missing directories along [path]. Fails if a non-directory sits on the path. */
private fun DocumentFile.ensureDirs(path: String): DocumentFile? {
    var cur: DocumentFile = this
    for (seg in path.split('/').filter { it.isNotEmpty() }) {
        val next = cur.findFile(seg)
        if (next == null) {
            cur = cur.createDirectory(seg) ?: return null
        } else if (next.isDirectory) {
            cur = next
        } else {
            AclLog.i("FAIL '$seg' exists and is not a directory")
            return null
        }
    }
    return cur
}
