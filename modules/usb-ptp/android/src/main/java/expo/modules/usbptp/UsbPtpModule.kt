package expo.modules.usbptp

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.net.Uri
import android.os.Build
import android.util.Log
import expo.modules.crashlog.AclRing
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

private const val TAG = "UsbPtp"
private const val FRAME_INTERVAL_MS = 33L
private const val NOT_READY_WAIT_MS = 200L
private const val PROPS_INTERVAL_MS = 1000L
/** Live view off during a run is transient for this long. A longer run ends the live view. */
private const val LIVE_OFF_GRACE_MS = 4000L

/**
 * PTP over USB for the Sony PC Remote. Blocking USB work runs on [io], never on the JS queue. Frames never
 * reach JS: the live loop hands them to [LiveFeed], and the LiveView view draws them.
 *
 * Events: "state" {status: connected|disconnected|error, message}, "props" {props: rows}.
 * "disconnected" means the link is gone (cable or USB error). "error" means a live-view or protocol failure
 * where the session may still be open. A deliberate disconnect() emits no state event.
 */
class UsbPtpModule : Module() {
    private class Pending(val promise: Promise, val device: UsbDevice)

    private val lock = Any()
    private val io: ExecutorService = Executors.newCachedThreadPool { r ->
        Thread(r, "usb-ptp-io").apply { isDaemon = true }
    }
    private var receiver: BroadcastReceiver? = null

    // All four fields below are guarded by [lock].
    private var session: PtpSession? = null
    private var run: LiveRun? = null
    private var pendingConnect: Pending? = null
    private var lastRows: List<PropRow>? = null

    override fun definition() = ModuleDefinition {
        Name("UsbPtp")
        Events("state", "props")

        OnCreate { registerUsbReceiver() }
        OnDestroy {
            unregisterUsbReceiver()
            stopRun()
            currentSession()?.let { dropSession(it, null, null) }
        }

        AsyncFunction("connect") { promise: Promise -> connectDevice(promise) }
        AsyncFunction("disconnect") { disconnectDevice() }
        AsyncFunction("readProps") { promise: Promise -> readPropsAsync(promise) }
        AsyncFunction("startLiveView") { promise: Promise -> startLiveAsync(promise) }
        AsyncFunction("stopLiveView") { stopRun() }
        AsyncFunction("snapshot") { slot: Int, promise: Promise -> snapshotAsync(slot, promise) }

        View(LiveViewView::class) {
            Name("LiveView")
            Events("onFps")
        }
    }

    private fun currentSession(): PtpSession? = synchronized(lock) { session }

    private fun usbManager(): UsbManager? =
        appContext.reactContext?.getSystemService(Context.USB_SERVICE) as? UsbManager

    private fun permissionAction(ctx: Context): String = "${ctx.packageName}.USB_PTP_PERMISSION"

    private fun connectDevice(promise: Promise) {
        val um = usbManager()
        if (um == null) {
            promise.reject("E_NO_CONTEXT", "React context unavailable", null)
            return
        }
        val dev = PtpSession.find(um)
        if (dev == null) {
            promise.reject("E_NO_DEVICE", "No PTP camera attached", null)
            return
        }
        // A newer connect supersedes one still waiting for the permission dialog.
        val superseded = synchronized(lock) {
            pendingConnect.also { pendingConnect = Pending(promise, dev) }
        }
        superseded?.promise?.reject("E_SUPERSEDED", "connect replaced by a newer call", null)
        currentSession()?.let { dropSession(it, null, null) }
        if (um.hasPermission(dev)) {
            takePending(dev.deviceName)?.let { openAndConnect(um, dev, it) }
        } else {
            val ctx = appContext.reactContext
            if (ctx == null) {
                takePending(dev.deviceName)?.promise?.reject("E_NO_CONTEXT", "React context unavailable", null)
                return
            }
            val intent = Intent(permissionAction(ctx)).setPackage(ctx.packageName)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            um.requestPermission(dev, PendingIntent.getBroadcast(ctx, 0, intent, flags))
        }
    }

    private fun takePending(deviceName: String): Pending? {
        synchronized(lock) {
            val p = pendingConnect ?: return null
            if (p.device.deviceName != deviceName) return null
            pendingConnect = null
            return p
        }
    }

    /** Opens the device and runs the connect sequence on [io]. Resolves or rejects [p]. */
    private fun openAndConnect(um: UsbManager, dev: UsbDevice, p: Pending) {
        io.execute {
            try {
                val s = PtpSession.open(um, dev)
                val info = try {
                    s.connect()
                } catch (e: Exception) {
                    s.close()
                    throw e
                }
                val old = synchronized(lock) {
                    session.also {
                        session = s
                        lastRows = null
                    }
                }
                old?.close()
                try {
                    publishProps(s, s.readRows())
                } catch (e: PtpProtocolException) {
                    Log.w(TAG, "initial props read failed", e)
                } catch (e: PtpFormatException) {
                    Log.w(TAG, "initial props read failed", e)
                } catch (e: IOException) {
                    dropSession(s, null, null)
                    throw e
                }
                sendEvent("state", mapOf("status" to "connected", "message" to null))
                p.promise.resolve(
                    mapOf("model" to info.model, "version" to info.version, "extVersion" to info.extVersion),
                )
            } catch (e: Exception) {
                rejectWith(p.promise, e)
            }
        }
    }

    private fun disconnectDevice() {
        currentSession()?.let { dropSession(it, null, null) }
    }

    private fun readPropsAsync(promise: Promise) {
        val s = currentSession()
        if (s == null) {
            promise.reject("E_NOT_CONNECTED", "Camera is not connected", null)
            return
        }
        io.execute {
            try {
                val rows = s.readRows()
                publishProps(s, rows)
                promise.resolve(rows.map { it.asMap() })
            } catch (e: Exception) {
                if (e is IOException) dropSession(s, "disconnected", e.message)
                rejectWith(promise, e)
            }
        }
    }

    private fun startLiveAsync(promise: Promise) {
        val s = currentSession()
        if (s == null) {
            promise.reject("E_NOT_CONNECTED", "Camera is not connected", null)
            return
        }
        io.execute {
            try {
                val t0 = System.currentTimeMillis()
                stopRun()
                s.startLiveView()
                val r = LiveRun(s, t0)
                val attached = synchronized(lock) {
                    if (session === s) {
                        run?.stop()
                        run = r
                        true
                    } else {
                        false
                    }
                }
                if (!attached) throw IOException("camera disconnected while starting live view")
                r.start()
                promise.resolve(null)
            } catch (e: Exception) {
                if (e is IOException) dropSession(s, "disconnected", e.message)
                rejectWith(promise, e)
            }
        }
    }

    private fun stopRun() {
        val r = synchronized(lock) { run.also { run = null } } ?: return
        r.stop()
        LiveFeed.clear()
    }

    /** Saves the newest frame as slot-N-<time>.jpg in filesDir/preview and returns its file URI. */
    private fun snapshotAsync(slot: Int, promise: Promise) {
        if (slot !in 1..4) {
            promise.reject("E_SLOT", "slot must be 1 to 4", null)
            return
        }
        val jpeg = LiveFeed.latest()
        if (jpeg == null) {
            promise.reject("E_NO_FRAME", "No live frame yet", null)
            return
        }
        val ctx = appContext.reactContext
        if (ctx == null) {
            promise.reject("E_NO_CONTEXT", "React context unavailable", null)
            return
        }
        io.execute {
            try {
                val dir = File(ctx.filesDir, "preview").apply { mkdirs() }
                dir.listFiles { f -> f.name.startsWith("slot-$slot-") }?.forEach { it.delete() }
                val target = File(dir, "slot-$slot-${System.currentTimeMillis()}.jpg")
                val tmp = File(dir, "${target.name}.tmp")
                tmp.writeBytes(jpeg)
                if (!tmp.renameTo(target)) throw IOException("rename to ${target.name} failed")
                promise.resolve(Uri.fromFile(target).toString())
            } catch (e: IOException) {
                promise.reject("E_IO", e.message ?: "snapshot write failed", e)
            }
        }
    }

    /** Clears the session if [s] is still the current one. Emits [status] when it is not null. */
    private fun dropSession(s: PtpSession, status: String?, message: String?) {
        val r = synchronized(lock) {
            if (session !== s) return
            session = null
            lastRows = null
            run.also { run = null }
        }
        r?.stop()
        LiveFeed.clear()
        s.close()
        if (status != null) sendEvent("state", mapOf("status" to status, "message" to message))
    }

    private fun failRun(r: LiveRun, message: String?) {
        val current = synchronized(lock) {
            if (run !== r) {
                false
            } else {
                run = null
                true
            }
        }
        if (!current) return
        r.stop()
        LiveFeed.clear()
        sendEvent("state", mapOf("status" to "error", "message" to message))
    }

    /** Emits props only when they differ from the last emitted rows for the same session. */
    private fun publishProps(s: PtpSession, rows: List<PropRow>) {
        val changed = synchronized(lock) {
            if (session !== s || rows == lastRows) {
                false
            } else {
                lastRows = rows
                true
            }
        }
        if (changed) sendEvent("props", mapOf("props" to rows.map { it.asMap() }))
    }

    private fun rejectWith(p: Promise, e: Throwable) {
        val code = when (e) {
            is PtpLiveViewOffException -> "E_LIVE_VIEW_OFF"
            is IOException -> "E_USB"
            else -> "E_PTP"
        }
        AclRing.i("reject $code: ${e.message}")
        p.reject(code, e.message ?: e.javaClass.simpleName, e)
    }

    private fun registerUsbReceiver() {
        val ctx = appContext.reactContext ?: return
        val action = permissionAction(ctx)
        val r = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val i = intent ?: return
                when (i.action) {
                    action -> onPermissionResult(i)
                    UsbManager.ACTION_USB_DEVICE_DETACHED -> onDetached(i)
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(action)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            ctx.registerReceiver(r, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            ctx.registerReceiver(r, filter)
        }
        receiver = r
    }

    private fun unregisterUsbReceiver() {
        val r = receiver ?: return
        receiver = null
        appContext.reactContext?.unregisterReceiver(r)
    }

    private fun onPermissionResult(i: Intent) {
        val dev = deviceExtra(i) ?: return
        val p = takePending(dev.deviceName) ?: return
        val um = usbManager()
        if (um == null) {
            p.promise.reject("E_NO_CONTEXT", "React context unavailable", null)
            return
        }
        if (!i.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
            p.promise.reject("E_PERMISSION", "USB permission was not granted", null)
            return
        }
        openAndConnect(um, dev, p)
    }

    private fun onDetached(i: Intent) {
        val dev = deviceExtra(i) ?: return
        takePending(dev.deviceName)?.promise?.reject("E_NO_DEVICE", "Camera was unplugged", null)
        val s = currentSession() ?: return
        if (s.deviceName == dev.deviceName) dropSession(s, "disconnected", "detached")
    }

    @Suppress("DEPRECATION")
    private fun deviceExtra(intent: Intent): UsbDevice? =
        if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        }

    private fun PropRow.asMap(): Map<String, Any?> = mapOf(
        "code" to code,
        "dataType" to dataType,
        "getSet" to getSet,
        "isEnabled" to isEnabled,
        "current" to current,
    )

    /** One live-view run: frames at most every 33 ms, props about every second. [startedAt] is when the start was requested. */
    private inner class LiveRun(private val s: PtpSession, private val startedAt: Long) {
        @Volatile
        var stopped = false
            private set

        fun start() {
            Thread({ loop() }, "usb-ptp-live").apply { isDaemon = true }.start()
        }

        fun stop() {
            stopped = true
        }

        private fun loop() {
            var nextProps = 0L
            var offSince = 0L
            var loggedFirst = false
            try {
                while (!stopped) {
                    val t0 = System.currentTimeMillis()
                    if (t0 >= nextProps) {
                        nextProps = t0 + PROPS_INTERVAL_MS
                        pollProps()
                    }
                    val jpeg = try {
                        s.liveViewFrame()
                    } catch (e: PtpLiveViewOffException) {
                        if (offSince == 0L) {
                            offSince = t0
                            AclRing.i("frame: live view off (0x2009), retrying")
                        }
                        if (t0 - offSince > LIVE_OFF_GRACE_MS) throw e
                        Thread.sleep(NOT_READY_WAIT_MS)
                        continue
                    }
                    if (offSince != 0L) {
                        AclRing.i("frame: live view back after ${t0 - offSince} ms")
                        offSince = 0L
                    }
                    if (stopped) break
                    if (jpeg == null) {
                        Thread.sleep(NOT_READY_WAIT_MS)
                        continue
                    }
                    if (!loggedFirst) {
                        loggedFirst = true
                        AclRing.i("first frame ${jpeg.size} bytes, ${System.currentTimeMillis() - startedAt} ms after start")
                    }
                    LiveFeed.offer(jpeg)
                    val spent = System.currentTimeMillis() - t0
                    if (spent < FRAME_INTERVAL_MS) Thread.sleep(FRAME_INTERVAL_MS - spent)
                }
            } catch (e: IOException) {
                AclRing.i("live view io error: ${e.message}")
                if (!stopped) dropSession(s, "disconnected", e.message)
            } catch (e: Exception) {
                Log.w(TAG, "live view failed", e)
                AclRing.i("live view failed: ${e.javaClass.simpleName} ${e.message}")
                if (!stopped) failRun(this, e.message)
            }
        }

        /** A bad props block must not end live view. An IO error still does. */
        private fun pollProps() {
            try {
                publishProps(s, s.readRows())
            } catch (e: PtpProtocolException) {
                Log.w(TAG, "props poll skipped", e)
            } catch (e: PtpFormatException) {
                Log.w(TAG, "props poll skipped", e)
            }
        }
    }
}
