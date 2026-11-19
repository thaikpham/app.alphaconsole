package expo.modules.usbvolume

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.io.IOException

class FileBackendTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private lateinit var card: File
    private lateinit var io: FileBackend
    private lateinit var backups: BackupStore

    private val id = "20260101-120000-000"
    private val oldBytes = "OLD-SETTINGS".toByteArray()
    private val newBytes = "NEW-SETTINGS-DATA".toByteArray()

    @Before
    fun setUp() {
        card = tmp.newFolder("card")
        File(card, SONYCARD).apply { parentFile.mkdirs(); writeText("") }
        io = FileBackend(card)
        backups = BackupStore(File(tmp.root, "backup"))
    }

    private fun place(name: String, bytes: ByteArray) {
        File(card, cardPath(name)).apply { parentFile.mkdirs(); writeBytes(bytes) }
    }

    private fun bytesOf(name: String): ByteArray? = File(card, cardPath(name)).takeIf { it.isFile }?.readBytes()

    private fun writerFor(target: CardIo = io) = CardWriter(target, backups)

    @Test
    fun writeVerifiedWritesAndReadsBack() {
        place("CAMPR01N.DAT", oldBytes)
        val outcome = writerFor().writeVerified(listOf(cardPath("CAMPR01N.DAT") to newBytes), id) { _, _ -> }
        assertTrue(outcome.ok)
        assertFalse(outcome.rolledBack)
        assertTrue(outcome.results.all { it.ok })
        assertArrayEquals(newBytes, bytesOf("CAMPR01N.DAT"))
    }

    @Test
    fun readBackMismatchRestoresOriginal() {
        place("CAMPR01N.DAT", oldBytes)
        val tamper = Tamper(io).apply { corruptNextWrites(cardPath("CAMPR01N.DAT")) }
        val outcome = writerFor(tamper).writeVerified(listOf(cardPath("CAMPR01N.DAT") to newBytes), id) { _, _ -> }
        assertFalse(outcome.ok)
        assertTrue(outcome.rolledBack)
        assertFalse(outcome.results.single().ok)
        assertArrayEquals(oldBytes, bytesOf("CAMPR01N.DAT"))
    }

    @Test
    fun writeFailureRestoresEveryAttemptedFileAndLeavesRestUntouched() {
        place("CAMPR01N.DAT", oldBytes)
        place("CAMPR02N.DAT", oldBytes)
        place("CAMPR03N.DAT", oldBytes)
        val tamper = Tamper(io).apply { failNextWrites(cardPath("CAMPR02N.DAT")) }
        val inputs = listOf(
            cardPath("CAMPR01N.DAT") to newBytes,
            cardPath("CAMPR02N.DAT") to newBytes,
            cardPath("CAMPR03N.DAT") to newBytes,
        )
        val outcome = writerFor(tamper).writeVerified(inputs, id) { _, _ -> }
        assertFalse(outcome.ok)
        assertTrue(outcome.rolledBack)
        assertEquals("not attempted", outcome.results[2].error)
        assertArrayEquals(oldBytes, bytesOf("CAMPR01N.DAT"))
        assertArrayEquals(oldBytes, bytesOf("CAMPR02N.DAT"))
        assertArrayEquals(oldBytes, bytesOf("CAMPR03N.DAT"))
    }

    @Test
    fun restoreReturnsCardToBackup() {
        place("CAMPR01N.DAT", oldBytes)
        writerFor().writeVerified(listOf(cardPath("CAMPR01N.DAT") to newBytes), id) { _, _ -> }
        val outcome = writerFor().restore(id)
        assertTrue(outcome.ok)
        assertArrayEquals(oldBytes, bytesOf("CAMPR01N.DAT"))
    }

    @Test
    fun restoreRemovesFilesThatDidNotExistBeforeTheWrite() {
        place("CAMPR01N.DAT", oldBytes)
        writerFor().writeVerified(
            listOf(cardPath("CAMPR01N.DAT") to newBytes, cardPath("CAMPR02N.DAT") to newBytes),
            id,
        ) { _, _ -> }
        assertTrue(writerFor().restore(id).ok)
        assertArrayEquals(oldBytes, bytesOf("CAMPR01N.DAT"))
        assertNull(bytesOf("CAMPR02N.DAT"))
    }

    @Test
    fun backupHoldsOnlyFilesThatExistedBeforeTheWrite() {
        place("CAMPR01N.DAT", oldBytes)
        writerFor().writeVerified(
            listOf(cardPath("CAMPR01N.DAT") to newBytes, cardPath("CAMPR02P.DAT") to newBytes),
            id,
        ) { _, _ -> }
        val content = backups.content(id)
        assertEquals(listOf("CAMPR01N.DAT"), content.files.map { it.name })
        assertArrayEquals(oldBytes, content.files.single().bytes)
        assertEquals(
            mapOf("CAMPR01N.DAT" to true, "CAMPR02P.DAT" to false),
            backups.entries(id).associate { it.name to it.existed },
        )
    }

    @Test
    fun refusesCardWithoutSonyMarkerAndCreatesNoSettingFolder() {
        File(card, SONYCARD).delete()
        val e = assertThrows(CardError::class.java) {
            writerFor().writeVerified(listOf(cardPath("CAMPR01N.DAT") to newBytes), id) { _, _ -> }
        }
        assertEquals("E_NOT_SONY_CARD", e.code)
        assertFalse(File(card, E10_DIR).exists())
    }

    @Test
    fun refusesPathsOutsideTheSettingFolder() {
        val paths = listOf(
            "PRIVATE/SONY/SETTING/E10/../../../DCIM/X.JPG",
            "PRIVATE/SONY/SETTING/E10/notes.txt",
        )
        for (rel in paths) {
            val e = assertThrows(CardError::class.java) {
                writerFor().writeVerified(listOf(rel to newBytes), id) { _, _ -> }
            }
            assertEquals("E_BAD_PATH", e.code)
        }
        assertFalse(File(card, E10_DIR).exists())
    }

    @Test
    fun restoreRefusesBadOrMissingBackupId() {
        val bad = assertThrows(CardError::class.java) { writerFor().restore("../../etc") }
        assertEquals("E_NO_BACKUP", bad.code)
        val missing = assertThrows(CardError::class.java) { writerFor().restore("20260101-000000-000") }
        assertEquals("E_NO_BACKUP", missing.code)
    }

    @Test
    fun inspectReportsSonyMarkerFamilyAndSettingFiles() {
        place("CAMPR01N.DAT", oldBytes)
        place("CAMPR02N.DAT", newBytes)
        val snap = inspectCard(io)
        assertTrue(snap.sonyCard)
        assertTrue(snap.settingDir)
        assertNull(snap.systemKind)
        assertEquals("N", snap.family)
        assertEquals(listOf("CAMPR01N.DAT", "CAMPR02N.DAT"), snap.files.map { it.name })
    }

    @Test
    fun inspectReportsNoFamilyWhenPAndNMixed() {
        place("CAMPR01N.DAT", oldBytes)
        place("CAMPR02P.DAT", newBytes)
        assertNull(inspectCard(io).family)
    }

    /** Wraps a card and fails or corrupts the next writes to chosen paths. Each setting applies to that many writes. */
    private class Tamper(private val inner: CardIo) : CardIo by inner {
        private val fail = HashMap<String, Int>()
        private val corrupt = HashMap<String, Int>()

        fun failNextWrites(path: String, times: Int = 1) {
            fail[path] = times
        }

        fun corruptNextWrites(path: String, times: Int = 1) {
            corrupt[path] = times
        }

        override fun write(relPath: String, bytes: ByteArray) {
            if (take(fail, relPath)) throw IOException("simulated write failure")
            if (take(corrupt, relPath)) {
                inner.write(relPath, bytes.copyOf().also { it[0] = (it[0] + 1).toByte() })
                return
            }
            inner.write(relPath, bytes)
        }

        private fun take(counts: MutableMap<String, Int>, path: String): Boolean {
            val left = counts[path] ?: return false
            if (left <= 0) return false
            counts[path] = left - 1
            return true
        }
    }
}
