package com.alphacolorlab.spike

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import java.io.Closeable
import java.io.File
import java.io.IOException

const val SONY_VID = 0x054C

class PtpResult(val code: Int, val params: IntArray, val data: ByteArray?)

/** One open PTP session over a still-image interface. Transactions are serialized with @Synchronized. */
class PtpDevice private constructor(
    private val conn: UsbDeviceConnection,
    private val iface: UsbInterface,
    private val bulkIn: UsbEndpoint,
    private val bulkOut: UsbEndpoint,
    private val intrIn: UsbEndpoint?,
) : Closeable {

    private val rx = ByteArray(16384)
    private var pending = ByteArray(0)
    private var txSeq = 0

    companion object {
        private const val TIMEOUT_MS = 5000

        /** Claims the still-image interface of [dev]. The caller must already hold USB permission. */
        fun open(um: UsbManager, dev: UsbDevice): PtpDevice {
            var found: UsbInterface? = null
            for (i in 0 until dev.interfaceCount) {
                val itf = dev.getInterface(i)
                AclLog.i("IF#${itf.id} class=${itf.interfaceClass} sub=${itf.interfaceSubclass} proto=${itf.interfaceProtocol} eps=${itf.endpointCount}")
                if (found == null && itf.interfaceClass == UsbConstants.USB_CLASS_STILL_IMAGE) found = itf
            }
            val itf = found ?: throw IOException("no still-image interface (class 6)")

            var bIn: UsbEndpoint? = null
            var bOut: UsbEndpoint? = null
            var iIn: UsbEndpoint? = null
            for (e in 0 until itf.endpointCount) {
                val ep = itf.getEndpoint(e)
                val inDir = ep.direction == UsbConstants.USB_DIR_IN
                when {
                    ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && inDir -> bIn = ep
                    ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && !inDir -> bOut = ep
                    ep.type == UsbConstants.USB_ENDPOINT_XFER_INT && inDir -> iIn = ep
                }
            }
            val bulkIn = bIn ?: throw IOException("no bulk IN endpoint")
            val bulkOut = bOut ?: throw IOException("no bulk OUT endpoint")
            AclLog.i("EP bulkIn=0x%02X bulkOut=0x%02X intrIn=%s".format(
                bulkIn.address, bulkOut.address, iIn?.let { "0x%02X".format(it.address) } ?: "none"))

            val conn = um.openDevice(dev) ?: throw IOException("openDevice returned null")
            if (!conn.claimInterface(itf, true)) {
                conn.close()
                throw IOException("claimInterface failed")
            }
            AclLog.i("claimed IF#${itf.id}")
            return PtpDevice(conn, itf, bulkIn, bulkOut, iIn)
        }
    }

    @Synchronized
    fun resetTx() {
        txSeq = 0
    }

    /** One PTP transaction: command, optional data-in phase, response. */
    @Synchronized
    fun transact(op: Int, params: IntArray = IntArray(0)): PtpResult {
        val tx = txSeq++
        send(PtpCodec.encodeCommand(op, tx, params))
        var data: ByteArray? = null
        var c = readContainer()
        while (c.type == Ptp.T_DATA) {
            data = c.payload
            c = readContainer()
        }
        if (c.type != Ptp.T_RESPONSE) throw IOException("expected response, got type ${c.type} for op ${Ptp.hex16(op)}")
        if (c.txId != tx) AclLog.i("WARN txId ${c.txId} != $tx")
        return PtpResult(c.code, c.params, data)
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
                if (len < 12) throw IOException("bad container length $len")
                if (pending.size >= len) {
                    val one = pending.copyOfRange(0, len.toInt())
                    pending = pending.copyOfRange(len.toInt(), pending.size)
                    return PtpCodec.decode(one)
                }
            }
            val n = conn.bulkTransfer(bulkIn, rx, rx.size, TIMEOUT_MS)
            if (n < 0) throw IOException("bulkIn timeout/error ($n), buffered=${pending.size}")
            if (n == 0) {
                if (++zeroReads > 3) throw IOException("bulkIn returned 0 bytes 4 times")
                continue
            }
            zeroReads = 0
            pending += rx.copyOf(n)
        }
    }

    /** Connect sequence from the brief. Logs each step. Returns the parsed DeviceInfo, if any. */
    fun connectSequence(outDir: File): PtpDeviceInfo? {
        outDir.mkdirs()

        val di = transact(Ptp.OP_GET_DEVICE_INFO)
        AclLog.i("GetDeviceInfo resp=${Ptp.hex16(di.code)} bytes=${di.data?.size ?: 0}")
        var info: PtpDeviceInfo? = null
        di.data?.let { raw ->
            try {
                info = parseDeviceInfo(raw)
                val d = info!!
                AclLog.i("StandardVersion=${d.standardVersion} VendorExtID=0x${"%08X".format(d.vendorExtId)} VendorExtVer=${d.vendorExtVersion} VendorExtDesc='${d.vendorExtDesc}'")
                AclLog.i("FunctionalMode=${Ptp.hex16(d.functionalMode)} Manufacturer='${d.manufacturer}' Model='${d.model}' DeviceVersion='${d.deviceVersion}' Serial='${d.serialNumber}'")
                AclLog.i("Events=${d.events.size} DevProps=${d.deviceProps.size} CaptureFmts=${d.captureFormats.size} ImageFmts=${d.imageFormats.size}")
            } catch (e: PtpFormatException) {
                AclLog.i("DeviceInfo parse error: ${e.message}")
            }
        }

        resetTx()
        val os = transact(Ptp.OP_OPEN_SESSION, intArrayOf(1))
        AclLog.i("OpenSession(1) resp=${Ptp.hex16(os.code)}")

        val c1 = transact(Ptp.OP_SDIO_CONNECT, intArrayOf(1, 0, 0))
        AclLog.i("SDIO_Connect(1,0,0) resp=${Ptp.hex16(c1.code)} bytes=${c1.data?.size ?: 0}")
        val c2 = transact(Ptp.OP_SDIO_CONNECT, intArrayOf(2, 0, 0))
        AclLog.i("SDIO_Connect(2,0,0) resp=${Ptp.hex16(c2.code)} bytes=${c2.data?.size ?: 0}")

        var ext: ByteArray? = null
        for (attempt in 1..10) {
            val r = transact(Ptp.OP_SDIO_GET_EXT_DEVICE_INFO, intArrayOf(0x00C8))
            AclLog.i("SDIO_GetExtDeviceInfo(0xC8) try $attempt resp=${Ptp.hex16(r.code)} bytes=${r.data?.size ?: 0}")
            val d = r.data
            if (d != null && d.isNotEmpty()) {
                ext = d
                break
            }
            Thread.sleep(200)
        }
        val extData = ext
        if (extData != null) {
            if (extData.size >= 2) AclLog.i("ExtDeviceInfo extVersion=${(extData[0].toInt() and 0xFF) or ((extData[1].toInt() and 0xFF) shl 8)}")
            AclLog.i("ExtDeviceInfo head64: ${Ptp.hexBytes(extData, 64)}")
            File(outDir, "extdeviceinfo.bin").writeBytes(extData)
        } else {
            AclLog.i("ExtDeviceInfo: no data after 10 tries")
        }

        val c3 = transact(Ptp.OP_SDIO_CONNECT, intArrayOf(3, 0, 0))
        AclLog.i("SDIO_Connect(3,0,0) resp=${Ptp.hex16(c3.code)} bytes=${c3.data?.size ?: 0}")

        info?.let { d ->
            AclLog.i("PTP model='${d.model}' version='${d.deviceVersion}' standard=${d.standardVersion}")
            AclLog.i("Operations (${d.operations.size}): " + d.operations.joinToString(" ") { Ptp.hex16(it) })
        }
        return info
    }

    /** GetAllExtDevicePropInfo, saves raw bytes, parses best-effort and logs each property. */
    fun readAllProps(outDir: File, stamp: String) {
        outDir.mkdirs()
        val r = transact(Ptp.OP_SDIO_GET_ALL_EXT_PROP_INFO)
        AclLog.i("GetAllExtDevicePropInfo resp=${Ptp.hex16(r.code)} bytes=${r.data?.size ?: 0}")
        val data = r.data ?: return
        val f = File(outDir, "allprops-$stamp.bin")
        f.writeBytes(data)
        AclLog.i("saved ${f.path}")

        val parsed = parseAllProps(data)
        AclLog.i("props parsed=${parsed.props.size}")
        for (p in parsed.props) {
            val name = Ptp.HIGHLIGHT[p.code]
            val tag = if (name != null) "[$name] " else ""
            AclLog.i("$tag${Ptp.hex16(p.code)} type=${Ptp.hex16(p.dataType)} get=${p.getSet} en=${p.isEnabled} cur=${Ptp.hexBytes(p.current)} form=${p.formFlag}")
        }
        parsed.note?.let { AclLog.i("props note: $it") }
    }

    /** Live-view GetObject on the LV handle. Caller handles pacing and decoding. */
    fun liveViewGet(): PtpResult = transact(Ptp.OP_GET_OBJECT, intArrayOf(Ptp.LV_HANDLE))

    override fun close() {
        try {
            conn.releaseInterface(iface)
        } catch (e: Exception) {
            AclLog.ex("releaseInterface", e)
        }
        conn.close()
        AclLog.i("PTP closed")
    }
}
