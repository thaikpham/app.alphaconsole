package com.alphacolorlab.spike

import android.content.Context
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** App files dir (external if available). */
fun appDir(ctx: Context): File = ctx.getExternalFilesDir(null) ?: ctx.filesDir

/** Every line goes to logcat (tag ACL), to acl-log.txt, and to the on-screen sink. */
object AclLog {
    private const val TAG = "ACL"
    private val lineFmt = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
    private val stampFmt = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US)

    @Volatile private var file: File? = null
    @Volatile var sink: ((String) -> Unit)? = null

    fun init(ctx: Context) {
        file = File(appDir(ctx), "acl-log.txt")
    }

    fun stamp(): String = synchronized(stampFmt) { stampFmt.format(Date()) }

    @Synchronized
    fun i(msg: String) {
        Log.i(TAG, msg)
        val line = lineFmt.format(Date()) + " " + msg
        try {
            file?.appendText(line + "\n")
        } catch (e: Exception) {
            Log.w(TAG, "log file write failed", e)
        }
        sink?.invoke(line)
    }

    fun ex(msg: String, t: Throwable) {
        Log.e(TAG, msg, t)
        i("EXC $msg: $t")
        val sw = StringWriter()
        t.printStackTrace(PrintWriter(sw))
        for (l in sw.toString().lines()) if (l.isNotBlank()) i("  $l")
    }

    @Synchronized
    fun clear() {
        try {
            file?.writeText("")
        } catch (e: Exception) {
            Log.w(TAG, "log clear failed", e)
        }
    }
}
