package expo.modules.usbvolume

import android.content.Context
import androidx.documentfile.provider.DocumentFile
import java.io.IOException

/**
 * Card access through the Storage Access Framework, used when all-files access is not granted.
 * [root] is the tree the user granted for this card's volume.
 */
internal class SafBackend(private val ctx: Context, private val root: DocumentFile) : CardIo {

    private fun find(relPath: String): DocumentFile? {
        var cur: DocumentFile? = root
        for (seg in relPath.split('/').filter { it.isNotEmpty() }) cur = cur?.findFile(seg) ?: return null
        return cur
    }

    /** The folder at [relPath], with missing parents created. Null if a file sits on the path or creation fails. */
    private fun dirAt(relPath: String): DocumentFile? {
        var cur: DocumentFile = root
        for (seg in relPath.split('/').filter { it.isNotEmpty() }) {
            val next = cur.findFile(seg)
            cur = when {
                next == null -> cur.createDirectory(seg) ?: return null
                next.isDirectory -> next
                else -> return null
            }
        }
        return cur
    }

    override fun exists(relPath: String): Boolean = find(relPath) != null

    override fun dirExists(relPath: String): Boolean = find(relPath)?.isDirectory == true

    override fun read(relPath: String): ByteArray? {
        val f = find(relPath)?.takeUnless { it.isDirectory } ?: return null
        val input = ctx.contentResolver.openInputStream(f.uri) ?: throw IOException("cannot open $relPath")
        return input.use { it.readBytes() }
    }

    override fun list(dirRelPath: String): List<String> =
        find(dirRelPath)?.takeIf { it.isDirectory }?.listFiles()?.mapNotNull { it.name }.orEmpty()

    override fun ensureDir(relPath: String): Boolean = dirAt(relPath) != null

    override fun write(relPath: String, bytes: ByteArray) {
        val name = relPath.substringAfterLast('/')
        val parent = dirAt(relPath.substringBeforeLast('/', ""))
            ?: throw IOException("cannot create folder for $relPath")
        val existing = parent.findFile(name)
        val f = existing ?: parent.createFile("application/octet-stream", name)
            ?: throw IOException("createFile returned null for $name")
        if (f.name != name) {
            if (existing == null) f.delete()
            throw IOException("provider named the file '${f.name}', not '$name'")
        }
        val out = ctx.contentResolver.openOutputStream(f.uri, "wt")
            ?: throw IOException("openOutputStream returned null for $name")
        out.use { it.write(bytes) }
    }

    override fun delete(relPath: String): Boolean {
        val f = find(relPath) ?: return true
        return f.delete()
    }
}
