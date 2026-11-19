package expo.modules.crashlog

import android.app.Application
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean

// Native half of the crash log. An uncaught exception writes one JSON file to filesDir/crash/, then the previous handler runs.
// The JS side reads the same folder (src/crash/). Keep the entry shape and the file name in step with src/crash/entry.ts.
internal object CrashLog {
    private const val DIR = "crash"
    private const val MAX_ENTRIES = 20
    private const val SOURCE = "native"

    private val installed = AtomicBoolean(false)

    fun install(app: Application) {
        if (!installed.compareAndSet(false, true)) return
        val dir = File(app.filesDir, DIR)
        val appVersion = appVersion(app)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                write(dir, appVersion, error)
            } catch (ignored: Throwable) {
                // Logging must not hide the crash. The previous handler still runs below.
            }
            previous?.uncaughtException(thread, error)
        }
    }

    private fun write(dir: File, appVersion: String, error: Throwable) {
        val time = isoNow()
        val entry = JSONObject()
            .put("time", time)
            .put("appVersion", appVersion)
            .put("androidVersion", Build.VERSION.RELEASE)
            .put("model", Build.MODEL)
            .put("source", SOURCE)
            .put("message", error.toString())
            .put("stack", stackOf(error))
            .put("acl", JSONArray(AclRing.snapshot()))
        dir.mkdirs()
        File(dir, fileName(time)).writeText(entry.toString())
        rotate(dir)
    }

    // Same digits as crashFileName in src/crash/entry.ts: the 17 digits of the time, then the source.
    // Sorting by name is sorting by time, so the oldest files come first.
    private fun fileName(time: String): String = "${time.filter(Char::isDigit).take(17)}-$SOURCE.json"

    // Keeps the newest MAX_ENTRIES files.
    private fun rotate(dir: File) {
        val files = dir.listFiles()?.filter { it.isFile && it.name.endsWith(".json") }?.sortedBy { it.name } ?: return
        val excess = files.size - MAX_ENTRIES
        if (excess > 0) files.take(excess).forEach { it.delete() }
    }

    private fun stackOf(error: Throwable): String =
        StringWriter().also { error.printStackTrace(PrintWriter(it)) }.toString()

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(Date())

    @Suppress("DEPRECATION")
    private fun appVersion(app: Application): String =
        try {
            app.packageManager.getPackageInfo(app.packageName, 0).versionName ?: "unknown"
        } catch (ignored: Exception) {
            "unknown"
        }
}
