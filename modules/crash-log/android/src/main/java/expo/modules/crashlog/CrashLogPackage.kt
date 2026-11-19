package expo.modules.crashlog

import android.app.Application
import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

// Autolinking finds this class: the file name ends in Package.kt and it imports expo.modules.core.interfaces.Package.
// Its listener runs in Application.onCreate, before the usb modules run, so the native crash handler is installed early.
class CrashLogPackage : Package {
    override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
        listOf(CrashLogApplicationListener())
}

private class CrashLogApplicationListener : ApplicationLifecycleListener {
    override fun onCreate(application: Application) {
        CrashLog.install(application)
    }
}
