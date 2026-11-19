package expo.modules.usbvolume

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class CardScanTest {
    /** A card in memory: a file at each key, folders implied by the path prefixes. Paths in [unreadable] throw on read. */
    private class MemoryCard(
        private val files: Map<String, ByteArray>,
        private val unreadable: Set<String> = emptySet(),
    ) : CardIo {
        override fun exists(relPath: String): Boolean = files.containsKey(relPath)
        override fun dirExists(relPath: String): Boolean = files.keys.any { it.startsWith("$relPath/") }
        override fun read(relPath: String): ByteArray? {
            if (relPath in unreadable) throw IOException("cannot read $relPath")
            return files[relPath]
        }
        override fun list(dirRelPath: String): List<String> =
            files.keys.filter { it.startsWith("$dirRelPath/") }.map { it.removePrefix("$dirRelPath/").substringBefore('/') }.distinct()
        override fun ensureDir(relPath: String): Boolean = error("not used by inspect")
        override fun write(relPath: String, bytes: ByteArray): Unit = error("not used by inspect")
        override fun delete(relPath: String): Boolean = error("not used by inspect")
    }

    private val sonyMarker = "PRIVATE/SONY/SONYCARD.IND" to ByteArray(0)

    /** A settings file whose header model, bytes 5 up to the NUL, is [model]. */
    private fun header(model: String): ByteArray {
        val bytes = ByteArray(0x44)
        "SONY".toByteArray(Charsets.ISO_8859_1).copyInto(bytes)
        model.toByteArray(Charsets.ISO_8859_1).copyInto(bytes, 5)
        return bytes
    }

    @Test
    fun defaultFolderIsE10() {
        val card = MemoryCard(
            mapOf(
                sonyMarker,
                "PRIVATE/SONY/SETTING/E10/CAMPR01P.DAT" to header("ZV-E10"),
                "PRIVATE/SONY/SETTING/E10/CAMPR02P.DAT" to header("ZV-E10"),
            ),
        )
        val snap = inspectCard(card)
        assertTrue(snap.sonyCard)
        assertTrue(snap.settingDir)
        assertEquals("P", snap.family)
        assertEquals(listOf("CAMPR01P.DAT", "CAMPR02P.DAT"), snap.files.map { it.name })
    }

    @Test
    fun scanFindsTheFolderWhoseHeaderMatches() {
        val a7c2 = header("ILCE-7CM2")
        val card = MemoryCard(
            mapOf(
                sonyMarker,
                "PRIVATE/SONY/SETTING/E10/CAMPR01P.DAT" to header("ZV-E10"),
                "PRIVATE/SONY/SETTING/7CM2/CAMPR01P.DAT" to a7c2,
                "PRIVATE/SONY/SETTING/7CM2/CAMPR02P.DAT" to a7c2,
            ),
        )
        val snap = inspectCard(card, null, "ILCE-7CM2")
        assertTrue(snap.settingDir)
        assertEquals(listOf("CAMPR01P.DAT", "CAMPR02P.DAT"), snap.files.map { it.name })
        assertArrayEquals(a7c2, snap.files[0].bytes)
    }

    @Test
    fun scanSkipsUnreadableFilesAndReportsNoFolderWhenNothingMatches() {
        val card = MemoryCard(
            mapOf(
                sonyMarker,
                "PRIVATE/SONY/SETTING/6400/CAMPR01P.DAT" to header("ILCE-6400"),
                "PRIVATE/SONY/SETTING/7CM2/CAMPR01P.DAT" to header("ILCE-7CM2"),
            ),
            unreadable = setOf("PRIVATE/SONY/SETTING/6400/CAMPR01P.DAT"),
        )
        assertEquals(listOf("CAMPR01P.DAT"), inspectCard(card, null, "ILCE-7CM2").files.map { it.name })
        val none = inspectCard(card, null, "ILCE-7C")
        assertFalse(none.settingDir)
        assertTrue(none.files.isEmpty())
    }

    @Test
    fun headerModelStopsAtNulAndIsCappedAtTheWindow() {
        assertEquals("ILCE-7CM2", headerModel(header("ILCE-7CM2")))
        assertEquals("", headerModel(header("")))
        assertEquals("A".repeat(15), headerModel(header("A".repeat(40))))
    }

    @Test
    fun folderNameMustBeCapitalsAndDigits() {
        val card = MemoryCard(mapOf(sonyMarker))
        val err = assertThrows(CardError::class.java) { inspectCard(card, "../E10", null) }
        assertEquals("E_BAD_PATH", err.code)
    }
}
