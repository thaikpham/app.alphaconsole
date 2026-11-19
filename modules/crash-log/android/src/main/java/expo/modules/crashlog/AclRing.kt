package expo.modules.crashlog

import android.util.Log

// Timing lines for the card read. Each line goes to logcat under tag ACL and into a ring, so a native crash file can include the last ones.
// The JS half of the ring is in src/card/timing.ts.
object AclRing {
    const val CAPACITY = 50

    private const val TAG = "ACL"
    private val lines = ArrayDeque<String>(CAPACITY)

    /** Logs [message] to logcat (tag ACL) and keeps "ACL $message" in the ring. */
    @Synchronized
    fun i(message: String) {
        Log.i(TAG, message)
        if (lines.size == CAPACITY) lines.removeFirst()
        lines.addLast("ACL $message")
    }

    /** The kept lines, oldest first. */
    @Synchronized
    fun snapshot(): List<String> = lines.toList()
}
