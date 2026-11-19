package expo.modules.usbvolume

import java.io.File
import java.io.FileOutputStream

/**
 * Card access through java.io.File, used when all-files access is granted. [root] is the volume directory,
 * /storage/<uuid>/. Each write is synced to the card before CardWriter reads it back.
 */
internal class FileBackend(private val root: File) : CardIo {
    private fun at(relPath: String): File = File(root, relPath)

    override fun exists(relPath: String): Boolean = at(relPath).exists()

    override fun dirExists(relPath: String): Boolean = at(relPath).isDirectory

    override fun read(relPath: String): ByteArray? {
        val f = at(relPath)
        return if (f.isFile) f.readBytes() else null
    }

    override fun list(dirRelPath: String): List<String> = at(dirRelPath).list().orEmpty().toList()

    override fun ensureDir(relPath: String): Boolean {
        val f = at(relPath)
        if (f.isDirectory) return true
        if (f.exists()) return false
        return f.mkdirs()
    }

    override fun write(relPath: String, bytes: ByteArray) {
        val f = at(relPath)
        f.parentFile?.mkdirs()
        FileOutputStream(f).use { out ->
            out.write(bytes)
            out.flush()
            out.fd.sync()
        }
    }

    override fun delete(relPath: String): Boolean {
        val f = at(relPath)
        return !f.exists() || f.delete()
    }
}
