package expo.modules.usbptp

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.util.Log
import expo.modules.crashlog.AclRing
import java.io.IOException

internal const val SONY_VID = 0x054C

private const val TAG = "UsbPtp"
private const val TIMEOUT_MS = 5000
private const val MAX_CONTAINER = 16 * 1024 * 1024L
/** Right after connect the camera answers live view off (0x2009) or not ready (0x200F) for a while. Retry this long. */
private const val LIVE_START_WINDOW_MS = 8000L
private const val LIVE_START_RETRY_MS = 250L

/** The camera answered a request with a response code the flow does not allow. */
class PtpProtocolException(msg: String) : Exception(msg)

/** Live view is off on the camera. The user has to turn on PC Remote in the menu. */
class PtpLiveViewOffException : Exception("live view is not enabled on the camera")

class PtpConnectInfo(val model: String, val version: String, val extVersion: Int?)

/**
 * One open PTP session over the still-image interface. Transactions are serialized by @Synchronized, so the
 * live loop and JS calls never interleave a command with another command's response.
 */
class PtpSession private constructor(
    private val conn: UsbDeviceConnection,
    private val iface: UsbInterface,
    private val bulkIn: UsbEndpoint,
    private val bulkOut: UsbEndpoint,
    val deviceName: String,
) {
    private class PtpResult(val code: Int, val data: ByteArray?)

    private val rx = ByteArray(16384)
    private var pending = ByteArray(0)
    private var txSeq = 0

    companion object {
        fun find(um: UsbManager): UsbDevice? =
            um.deviceList.values.firstOrNull { it.vendorId == SONY_VID && hasStillImage(it) }

        private fun hasStillImage(dev: UsbDevice): Boolean =
            (0 until dev.interfaceCount).any { dev.getInterface(it).interfaceClass == UsbConstants.USB_CLASS_STILL_IMAGE }

        /** The caller must already hold USB permission for [dev]. */
        fun open(um: UsbManager, dev: UsbDevice): PtpSession {
            val itf = (0 until dev.interfaceCount).map { dev.getInterface(it) }
                .firstOrNull { it.interfaceClass == UsbConstants.USB_CLASS_STILL_IMAGE }
                ?: throw IOException("no still-image interface (class 6)")
            var bIn: UsbEndpoint? = null
            var bOut: UsbEndpoint? = null
            for (e in 0 until itf.endpointCount) {
                val ep = itf.getEndpoint(e)
                if (ep.type != UsbConstants.USB_ENDPOINT_XFER_BULK) continue
                if (ep.direction == UsbConstants.USB_DIR_IN) bIn = ep else bOut = ep
            }
            val inEp = bIn ?: throw IOException("no bulk IN endpoint")
            val outEp = bOut ?: throw IOException("no bulk OUT endpoint")
            val conn = um.openDevice(dev) ?: throw IOException("openDevice returned null")
            if (!conn.claimInterface(itf, true)) {
                conn.close()
                throw IOException("claimInterface failed")
            }
            return PtpSession(conn, itf, inEp, outEp, dev.deviceName)
        }
    }

    /** Connect sequence from the spike: GetDeviceInfo, OpenSession, SDIO connect steps, ExtDeviceInfo. */
    @Synchronized
    fun connect(): PtpConnectInfo {
        val t0 = System.currentTimeMillis()
        val di = step("GetDeviceInfo", t0, Ptp.OP_GET_DEVICE_INFO)
        val info = parseDeviceInfo(di.data ?: throw PtpProtocolException("GetDeviceInfo returned no data"))
        txSeq = 0
        step("OpenSession", t0, Ptp.OP_OPEN_SESSION, 1)
        step("SDIO connect 1", t0, Ptp.OP_SDIO_CONNECT, 1, 0, 0)
        step("SDIO connect 2", t0, Ptp.OP_SDIO_CONNECT, 2, 0, 0)
        var ext: ByteArray? = null
        for (attempt in 1..10) {
            val d = step("ExtDeviceInfo $attempt", t0, Ptp.OP_SDIO_GET_EXT_DEVICE_INFO, 0x00C8).data
            if (d != null && d.isNotEmpty()) {
                ext = d
                break
            }
            Thread.sleep(200)
        }
        step("SDIO connect 3", t0, Ptp.OP_SDIO_CONNECT, 3, 0, 0)
        val extVersion = ext?.takeIf { it.size >= 2 }?.let { PtpBuf(it).u16() }
        return PtpConnectInfo(info.model, info.deviceVersion, extVersion)
    }

    /** One connect step: the transaction, then a log line with its response code and the ms since [t0]. */
    private fun step(label: String, t0: Long, op: Int, vararg params: Int): PtpResult {
        val r = transact(op, params)
        AclRing.i("connect $label ${Ptp.hex(r.code)} ${System.currentTimeMillis() - t0} ms")
        return r
    }

    /** GetAllExtDevicePropInfo as rows. A partial parse is logged and the readable rows are returned. */
    @Synchronized
    fun readRows(): List<PropRow> {
        val r = transact(Ptp.OP_SDIO_GET_ALL_EXT_PROP_INFO)
        val data = r.data ?: throw PtpProtocolException("GetAllExtDevicePropInfo returned no data, code ${Ptp.hex(r.code)}")
        val parsed = parseAllProps(data)
        parsed.note?.let { Log.w(TAG, "props: $it") }
        return parsed.props.map { it.toRow() }
    }

    /**
     * GetObjectInfo on the live-view handle. Starts the frame stream on the camera. Right after connect the camera
     * answers 0x2009 or 0x200F for a while, so both are retried every [LIVE_START_RETRY_MS] for [LIVE_START_WINDOW_MS].
     */
    @Synchronized
    fun startLiveView() {
        val t0 = System.currentTimeMillis()
        var attempt = 0
        while (true) {
            attempt++
            val r = transact(Ptp.OP_GET_OBJECT_INFO, intArrayOf(Ptp.LV_HANDLE))
            val ms = System.currentTimeMillis() - t0
            AclRing.i("startLiveView attempt $attempt ${Ptp.hex(r.code)} $ms ms")
            when (r.code) {
                Ptp.RC_OK -> return
                Ptp.RC_LIVE_VIEW_NOT_ENABLED, Ptp.RC_NOT_READY -> {
                    if (ms >= LIVE_START_WINDOW_MS) {
                        AclRing.i("startLiveView gave up after $attempt attempts, ${Ptp.hex(r.code)}")
                        if (r.code == Ptp.RC_LIVE_VIEW_NOT_ENABLED) throw PtpLiveViewOffException()
                        throw PtpProtocolException("GetObjectInfo(live view) ${Ptp.hex(r.code)}")
                    }
                    Thread.sleep(LIVE_START_RETRY_MS)
                }
                else -> throw PtpProtocolException("GetObjectInfo(live view) ${Ptp.hex(r.code)}")
            }
        }
    }

    /**
     * One GetObject on the live-view handle. Null when the camera is not ready yet (0x200F), or the frame is malformed.
     * Throws [PtpLiveViewOffException] on 0x2009.
     */
    @Synchronized
    fun liveViewFrame(): ByteArray? {
        val r = transact(Ptp.OP_GET_OBJECT, intArrayOf(Ptp.LV_HANDLE))
        return when (r.code) {
            Ptp.RC_OK -> PtpCodec.liveViewJpeg(r.data)
            Ptp.RC_NOT_READY -> null
            Ptp.RC_LIVE_VIEW_NOT_ENABLED -> throw PtpLiveViewOffException()
            else -> throw PtpProtocolException("GetObject(live view) ${Ptp.hex(r.code)}")
        }
    }

    /** Safe from any thread. A transaction in flight fails with IOException. */
    fun close() {
        try {
            conn.releaseInterface(iface)
        } catch (e: Exception) {
            Log.w(TAG, "releaseInterface failed", e)
        }
        conn.close()
    }

    /** One PTP transaction: command, optional data-in phase, response. */
    @Synchronized
    private fun transact(op: Int, params: IntArray = IntArray(0)): PtpResult {
        val tx = txSeq++
        send(PtpCodec.encodeCommand(op, tx, params))
        var data: ByteArray? = null
        var c = readContainer()
        while (c.type == Ptp.T_DATA) {
            data = c.payload
            c = readContainer()
        }
        if (c.type != Ptp.T_RESPONSE) throw PtpProtocolException("expected response, got type ${c.type} for ${Ptp.hex(op)}")
        if (c.txId != tx) Log.w(TAG, "txId ${c.txId} != $tx")
        return PtpResult(c.code, data)
    }

    private fun send(b: ByteArray) {
        val n = conn.bulkTransfer(bulkOut, b, b.size, TIMEOUT_MS)
        if (n != b.size) throw IOException("bulkOut sent $n of ${b.size}")
    }

    private fun readContainer(): PtpContainer {
        var zeroReads = 0
        while (true) {
            if (pending.size >= 4) {
                val len = PtpCodec.u32le(pending, 0)
                if (len < 12 || len > MAX_CONTAINER) throw PtpFormatException("container length $len")
                if (pending.size >= len) {
                    val one = pending.copyOfRange(0, len.toInt())
                    pending = pending.copyOfRange(len.toInt(), pending.size)
                    return PtpCodec.decode(one)
                }
            }
            val n = conn.bulkTransfer(bulkIn, rx, rx.size, TIMEOUT_MS)
            if (n < 0) throw IOException("bulkIn failed ($n), buffered ${pending.size}")
            if (n == 0) {
                if (++zeroReads > 3) throw IOException("bulkIn returned 0 bytes 4 times")
                continue
            }
            zeroReads = 0
            pending += rx.copyOf(n)
        }
    }
}
