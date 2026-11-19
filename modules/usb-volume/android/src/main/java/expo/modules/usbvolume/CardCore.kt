package expo.modules.usbvolume

import java.io.File
import java.io.IOException

// Card logic shared by every backend. Pure Kotlin with no android.* imports, so JVM unit tests can run it.

/** Failure with a code the JS side reads. The module turns it into a CodedException. */
internal class CardError(val code: String, message: String) : Exception(message)

internal const val SONYCARD = "PRIVATE/SONY/SONYCARD.IND"
internal const val MEDIAPRO = "PRIVATE/M4ROOT/MEDIAPRO.XML"
internal const val SETTING_ROOT = "PRIVATE/SONY/SETTING"
internal const val E10_DIR = "PRIVATE/SONY/SETTING/E10"

/** A volume smaller than this is not a camera card. The camera's own PMHOME volume is 64 MB. */
internal const val MIN_CARD_BYTES = 512L * 1024 * 1024

private const val MANIFEST = "manifest.json"
private val CAMPR = Regex("""CAMPR0([1-4])([NP])\.DAT""")
/** A setting folder is one name of capitals and digits, such as E10 or 7CM2. Nothing else can leave the setting root. */
private val FOLDER_NAME = Regex("""[A-Z0-9]{1,16}""")
/** The header model is read up to this offset, as the web codecs do. */
private const val HEADER_MODEL_END = 0x14
private val BACKUP_ID = Regex("""\d{8}-\d{6}-\d{3}""")
// The format of MEDIAPRO.XML is not fully verified; the match is best-effort.
private val SYSTEM_KIND = Regex("""(?i)systemkind\W{1,4}([A-Za-z0-9_.-]+)""")
private val MANIFEST_OBJECT = Regex("\\{[^{}]*\\}")
private val MANIFEST_NAME = Regex("\"name\"\\s*:\\s*\"([^\"]+)\"")
private val MANIFEST_EXISTED = Regex("\"existed\"\\s*:\\s*(true|false)")
private val MANIFEST_CREATED = Regex("\"createdAt\"\\s*:\\s*(\\d+)")

internal fun cardPath(name: String): String = "$E10_DIR/$name"

internal class CardFile(val name: String, val bytes: ByteArray)
internal class FileOutcome(val relPath: String, val ok: Boolean, val error: String?)
internal class WriteOutcome(val backupId: String, val ok: Boolean, val rolledBack: Boolean, val results: List<FileOutcome>)
internal class RestoreOutcome(val backupId: String, val ok: Boolean, val results: List<FileOutcome>)
internal class CardSnapshot(
    val sonyCard: Boolean,
    val systemKind: String?,
    val family: String?,
    val settingDir: Boolean,
    val files: List<CardFile>,
)
internal class BackupSummary(val id: String, val createdAt: Long, val files: Int)
internal class BackupContent(val id: String, val files: List<CardFile>)
internal class BackupEntry(val name: String, val existed: Boolean)

/** One card, addressed by slash-separated paths relative to its root. FileBackend and SafBackend implement it. */
internal interface CardIo {
    fun exists(relPath: String): Boolean
    fun dirExists(relPath: String): Boolean

    /** Bytes of the file, or null when there is no such file. Throws IOException when it exists but cannot be read. */
    fun read(relPath: String): ByteArray?

    /** Names of the entries in a folder. Empty when the folder is missing. */
    fun list(dirRelPath: String): List<String>

    /** Creates the folder and any missing parents. False when a file sits on the path or creation fails. */
    fun ensureDir(relPath: String): Boolean

    /** Creates or replaces the file. Throws IOException on failure. Does not read back; CardWriter does that. */
    fun write(relPath: String, bytes: ByteArray)

    /** Removes the file. True when it is gone afterwards. */
    fun delete(relPath: String): Boolean
}

/** A removable volume seen by discovery. [handle] is whatever reaches it. */
internal class VolumeProbe<T>(val uuid: String, val sonyCard: Boolean, val totalBytes: Long, val handle: T)

/** Slot 1: the first Sony card in StorageManager order that is card-sized. Null when there is none. */
internal fun <T> pickSlot1(probes: List<VolumeProbe<T>>): VolumeProbe<T>? =
    probes.firstOrNull { it.sonyCard && it.totalBytes >= MIN_CARD_BYTES }

/** Reads the Sony markers and the M1–M4 settings files of a card. */
internal fun inspectCard(io: CardIo, folder: String? = "E10", sonyModel: String? = null): CardSnapshot {
    if (folder != null && FOLDER_NAME.matchEntire(folder) == null) throw CardError("E_BAD_PATH", "Bad setting folder $folder")
    val sonyCard = io.exists(SONYCARD)
    val systemKind = io.read(MEDIAPRO)?.toString(Charsets.UTF_8)?.let { SYSTEM_KIND.find(it)?.groupValues?.get(1) }
    val name = folder ?: sonyModel?.let { findSettingFolder(io, it) }
    val dir = name?.let { "$SETTING_ROOT/$it" }
    val names = if (dir == null) emptyList() else camprNames(io, dir)
    val files = names.map { CardFile(it, io.read("$dir/$it") ?: throw IOException("cannot read $it")) }
    val families = names.mapNotNull { CAMPR.matchEntire(it)?.groupValues?.get(2) }.toSet()
    return CardSnapshot(sonyCard, systemKind, families.singleOrNull(), dir != null && io.dirExists(dir), files)
}

private fun camprNames(io: CardIo, dirRelPath: String): List<String> =
    io.list(dirRelPath).filter { CAMPR.matchEntire(it) != null }.sorted()

/** The first setting folder with a settings file whose header model is [sonyModel]. Unreadable files do not match. */
private fun findSettingFolder(io: CardIo, sonyModel: String): String? =
    io.list(SETTING_ROOT).sorted().firstOrNull { folder ->
        val dir = "$SETTING_ROOT/$folder"
        FOLDER_NAME.matchEntire(folder) != null && io.dirExists(dir) &&
            camprNames(io, dir).any { name ->
                runCatching { io.read("$dir/$name") }.getOrNull()?.let { headerModel(it) == sonyModel } == true
            }
    }

/** Model string in a settings file header: the bytes from 5 up to the first NUL, within the first 0x14 bytes. */
internal fun headerModel(bytes: ByteArray): String {
    val limit = minOf(bytes.size, HEADER_MODEL_END)
    val end = (5 until limit).firstOrNull { bytes[it] == 0.toByte() } ?: limit
    return if (end > 5) String(bytes, 5, end - 5, Charsets.ISO_8859_1) else ""
}

/**
 * Writes and restores a card's settings files. Every write is read back and compared. A failure restores the
 * backup taken before the write, so the card ends as it started.
 */
internal class CardWriter(private val io: CardIo, private val backups: BackupStore) {
    private class Target(val name: String, val relPath: String, val bytes: ByteArray)

    /**
     * Backs up, writes each file, reads it back, and restores the backup if anything fails.
     * [id] names the backup folder. [progress] gets (relPath, status); status is writing, ok, error, skipped,
     * restoring, restored or restore-failed.
     */
    fun writeVerified(
        inputs: List<Pair<String, ByteArray>>,
        id: String,
        progress: (String, String) -> Unit,
    ): WriteOutcome {
        requireSonyCard()
        val targets = inputs.map { (rel, bytes) -> Target(nameOf(rel), rel, bytes) }
        ensureSettingDir()

        val originals = LinkedHashMap<String, ByteArray?>()
        for (t in targets) {
            originals[t.name] = try {
                io.read(cardPath(t.name))
            } catch (e: IOException) {
                throw CardError("E_CARD_IO", "Cannot back up ${t.name}")
            }
        }
        backups.save(id, originals.toList())

        val results = ArrayList<FileOutcome>()
        val attempted = ArrayList<String>()
        var failed = false
        for (t in targets) {
            if (failed) {
                results.add(FileOutcome(t.relPath, false, "not attempted"))
                progress(t.relPath, "skipped")
                continue
            }
            attempted.add(t.name)
            progress(t.relPath, "writing")
            val err = runCatching { putVerified(t.name, t.bytes) }.exceptionOrNull()
            failed = err != null
            results.add(FileOutcome(t.relPath, err == null, err?.message))
            progress(t.relPath, if (err == null) "ok" else "error")
        }

        var rolledBack = false
        if (failed) {
            progress("", "restoring")
            rolledBack = runCatching { restoreOriginals(attempted, originals) }.isSuccess
            progress("", if (rolledBack) "restored" else "restore-failed")
        }
        return WriteOutcome(id, !failed, rolledBack, results)
    }

    /** Puts the card back to the state saved in backup [id]. Files that did not exist before are removed. */
    fun restore(id: String): RestoreOutcome {
        requireSonyCard()
        val entries = backups.entries(id)
        ensureSettingDir()
        val results = ArrayList<FileOutcome>()
        var allOk = true
        for (e in entries) {
            val rel = cardPath(e.name)
            val err = runCatching {
                if (e.existed) {
                    putVerified(e.name, backups.file(id, e.name))
                } else if (!io.delete(rel)) {
                    throw IOException("cannot delete ${e.name}")
                }
            }.exceptionOrNull()
            allOk = allOk && err == null
            results.add(FileOutcome(rel, err == null, err?.message))
        }
        return RestoreOutcome(id, allOk, results)
    }

    private fun restoreOriginals(names: List<String>, originals: Map<String, ByteArray?>) {
        for (name in names) {
            val original = originals[name]
            if (original != null) {
                putVerified(name, original)
            } else if (!io.delete(cardPath(name))) {
                throw IOException("cannot delete $name")
            }
        }
    }

    /** Writes [bytes] as [name] in the setting folder and throws unless the read-back matches. */
    private fun putVerified(name: String, bytes: ByteArray) {
        val rel = cardPath(name)
        io.write(rel, bytes)
        val back = io.read(rel)
        if (back == null || !back.contentEquals(bytes)) {
            throw IOException("read-back mismatch for $name (wrote ${bytes.size}, read ${back?.size})")
        }
    }

    private fun requireSonyCard() {
        if (!io.exists(SONYCARD)) throw CardError("E_NOT_SONY_CARD", "Card has no Sony markers; format it in the camera")
    }

    private fun ensureSettingDir() {
        if (!io.ensureDir(E10_DIR)) throw CardError("E_CARD_IO", "Cannot create $E10_DIR")
    }

    /** Only CAMPR files directly in the setting folder may be written. Returns the file name. */
    private fun nameOf(relPath: String): String {
        val name = relPath.removePrefix("$E10_DIR/")
        if (relPath != cardPath(name) || CAMPR.matchEntire(name) == null) {
            throw CardError("E_BAD_PATH", "Refusing to write $relPath")
        }
        return name
    }
}

/**
 * Backup folders under [root], one per write. Each holds the card's settings files as they were before the write,
 * plus a manifest that records which of them existed.
 */
internal class BackupStore(private val root: File) {

    fun list(): List<BackupSummary> =
        root.listFiles().orEmpty()
            .filter { File(it, MANIFEST).isFile }
            .sortedByDescending { it.name }
            .map { dir ->
                val text = File(dir, MANIFEST).readText()
                BackupSummary(dir.name, createdAtOf(text), parseEntries(text).size)
            }

    /** Entries of backup [id]: each file name and whether it existed before the write. */
    fun entries(id: String): List<BackupEntry> = parseEntries(manifestText(id))

    /** Files saved in backup [id]. Only files that existed before the write are stored. */
    fun content(id: String): BackupContent =
        BackupContent(id, entries(id).filter { it.existed }.map { CardFile(it.name, file(id, it.name)) })

    fun file(id: String, name: String): ByteArray {
        if (CAMPR.matchEntire(name) == null) throw CardError("E_NO_BACKUP", "Backup $id has a bad entry")
        return File(dir(id), name).readBytes()
    }

    /** Writes the manifest, then the original bytes. A null original marks a file that did not exist before the write. */
    fun save(id: String, originals: List<Pair<String, ByteArray?>>, createdAt: Long = System.currentTimeMillis()) {
        val d = dir(id)
        d.mkdirs()
        for ((name, _) in originals) require(CAMPR.matchEntire(name) != null) { "not a settings file: $name" }
        val entries = originals.joinToString(",") { (name, bytes) -> "{\"name\":\"$name\",\"existed\":${bytes != null}}" }
        File(d, MANIFEST).writeText("{\"id\":\"$id\",\"createdAt\":$createdAt,\"entries\":[$entries]}")
        for ((name, bytes) in originals) if (bytes != null) File(d, name).writeBytes(bytes)
    }

    /** Backup folder for [id]. Only ids in the stamp format are accepted, so no path can escape the root. */
    private fun dir(id: String): File {
        if (BACKUP_ID.matchEntire(id) == null) throw CardError("E_NO_BACKUP", "Backup $id not found")
        return File(root, id)
    }

    private fun manifestText(id: String): String {
        val f = File(dir(id), MANIFEST)
        if (!f.isFile) throw CardError("E_NO_BACKUP", "Backup $id not found")
        return f.readText()
    }

    // Reads the manifest without a JSON library, so the JVM tests need no org.json. Matches the keys in any order.
    private fun parseEntries(text: String): List<BackupEntry> =
        MANIFEST_OBJECT.findAll(text).map { m ->
            val name = MANIFEST_NAME.find(m.value)?.groupValues?.get(1)
            val existed = MANIFEST_EXISTED.find(m.value)?.groupValues?.get(1)
            if (name == null || existed == null || CAMPR.matchEntire(name) == null) {
                throw CardError("E_NO_BACKUP", "Backup manifest is damaged")
            }
            BackupEntry(name, existed == "true")
        }.toList()

    private fun createdAtOf(text: String): Long =
        MANIFEST_CREATED.find(text)?.groupValues?.get(1)?.toLong()
            ?: throw CardError("E_NO_BACKUP", "Backup manifest is damaged")
}
