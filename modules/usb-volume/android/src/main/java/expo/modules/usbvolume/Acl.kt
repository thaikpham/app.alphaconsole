package expo.modules.usbvolume

import expo.modules.crashlog.AclRing

// Timing logs for the card read, tag ACL in logcat. ACL_DEBUG is the one switch for the native side; it stays on for the beta.
// The JS side has its own switch, CARD_DEBUG in src/card/timing.ts.
internal const val ACL_DEBUG = true

/** Runs [block] and logs its elapsed ms when ACL_DEBUG is on. */
internal inline fun <T> aclTimed(label: String, block: () -> T): T {
    if (!ACL_DEBUG) return block()
    val start = System.nanoTime()
    try {
        return block()
    } finally {
        AclRing.i("$label ${(System.nanoTime() - start) / 1_000_000} ms")
    }
}

/** [io] with each call logged and timed, or [io] itself when ACL_DEBUG is off. [backend] names it in the log. */
internal fun timedIo(io: CardIo, backend: String): CardIo = if (ACL_DEBUG) TimedCardIo(io, backend) else io

private class TimedCardIo(private val io: CardIo, private val backend: String) : CardIo {
    override fun exists(relPath: String): Boolean = aclTimed("io.$backend exists $relPath") { io.exists(relPath) }

    override fun dirExists(relPath: String): Boolean = aclTimed("io.$backend dirExists $relPath") { io.dirExists(relPath) }

    override fun read(relPath: String): ByteArray? = aclTimed("io.$backend read $relPath") { io.read(relPath) }

    override fun list(dirRelPath: String): List<String> =
        aclTimed("io.$backend list $dirRelPath") { io.list(dirRelPath) }

    override fun ensureDir(relPath: String): Boolean = aclTimed("io.$backend ensureDir $relPath") { io.ensureDir(relPath) }

    override fun write(relPath: String, bytes: ByteArray) =
        aclTimed("io.$backend write $relPath") { io.write(relPath, bytes) }

    override fun delete(relPath: String): Boolean = aclTimed("io.$backend delete $relPath") { io.delete(relPath) }
}
