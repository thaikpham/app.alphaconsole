package expo.modules.usbptp

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

interface FrameSink {
    fun onFrame(jpeg: ByteArray)
}

/** Newest live-view JPEG, shared by the live loop and every LiveView on screen. */
object LiveFeed {
    private val sinks = CopyOnWriteArraySet<FrameSink>()

    @Volatile
    private var latestJpeg: ByteArray? = null

    fun add(s: FrameSink) {
        sinks.add(s)
    }

    fun remove(s: FrameSink) {
        sinks.remove(s)
    }

    fun offer(jpeg: ByteArray) {
        latestJpeg = jpeg
        for (s in sinks) s.onFrame(jpeg)
    }

    fun latest(): ByteArray? = latestJpeg

    fun clear() {
        latestJpeg = null
    }
}

/**
 * Draws live-view frames. Decoding runs on one shared background thread. When decoding falls behind, only the
 * newest frame is kept. Emits onFps about once a second.
 */
class LiveViewView(context: Context, appContext: AppContext) : ExpoView(context, appContext), FrameSink {
    private val onFps by EventDispatcher()

    override val shouldUseAndroidLayout: Boolean
        get() = true

    private val image = ImageView(context).apply {
        scaleType = ImageView.ScaleType.FIT_CENTER
    }
    private val pending = AtomicReference<ByteArray?>(null)
    private val draining = AtomicBoolean(false)
    private val main = Handler(Looper.getMainLooper())

    // Main thread only.
    private var shown: Bitmap? = null
    private var frames = 0
    private var windowStart = System.currentTimeMillis()

    init {
        addView(
            image,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
        )
    }

    companion object {
        private val decoder: ExecutorService = Executors.newSingleThreadExecutor { r ->
            Thread(r, "usb-ptp-decode").apply { isDaemon = true }
        }
    }

    override fun onFrame(jpeg: ByteArray) {
        pending.set(jpeg)
        if (draining.compareAndSet(false, true)) decoder.execute { drain() }
    }

    private fun drain() {
        while (true) {
            val jpeg = pending.getAndSet(null) ?: break
            val opts = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.RGB_565 }
            val bmp = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size, opts)
            if (bmp != null) main.post { show(bmp) }
        }
        draining.set(false)
        // A frame may have arrived after the last check. Pick it up.
        if (pending.get() != null && draining.compareAndSet(false, true)) decoder.execute { drain() }
    }

    private fun show(bmp: Bitmap) {
        if (!isAttachedToWindow) {
            bmp.recycle()
            return
        }
        image.setImageBitmap(bmp)
        shown?.recycle()
        shown = bmp
        countFrame()
    }

    private fun countFrame() {
        frames++
        val now = System.currentTimeMillis()
        if (now - windowStart >= 1000) {
            onFps(mapOf("fps" to frames))
            frames = 0
            windowStart = now
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        LiveFeed.add(this)
    }

    override fun onDetachedFromWindow() {
        LiveFeed.remove(this)
        image.setImageDrawable(null)
        shown?.recycle()
        shown = null
        super.onDetachedFromWindow()
    }
}
