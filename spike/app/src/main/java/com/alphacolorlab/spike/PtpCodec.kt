package com.alphacolorlab.spike

import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Pure PTP encoding/decoding. No Android types here so it runs in JVM unit tests. */

class PtpFormatException(msg: String) : Exception(msg)

object Ptp {
    const val T_COMMAND = 1
    const val T_DATA = 2
    const val T_RESPONSE = 3
    const val T_EVENT = 4

    const val OP_GET_DEVICE_INFO = 0x1001
    const val OP_OPEN_SESSION = 0x1002
    const val OP_GET_OBJECT_INFO = 0x1008
    const val OP_GET_OBJECT = 0x1009
    const val OP_SDIO_CONNECT = 0x9201
    const val OP_SDIO_GET_EXT_DEVICE_INFO = 0x9202
    const val OP_SDIO_GET_ALL_EXT_PROP_INFO = 0x9209

    const val RC_OK = 0x2001
    const val RC_LIVE_VIEW_NOT_ENABLED = 0x2009
    const val RC_ACCESS_DENIED = 0x200F

    val LV_HANDLE: Int = 0xFFFFC002.toInt()

    val HIGHLIGHT: Map<Int, String> = mapOf(
        0x500E to "ExposureProgram",
        0x5007 to "FNumber",
        0xD20D to "Shutter",
        0xD21E to "ISO",
        0x5005 to "WB",
        0xD20F to "ColorTemp",
        0xD23F to "PictureProfile",
        0x500A to "FocusMode",
        0xD22C to "FocusArea",
        0x500B to "Metering",
        0xD178 to "SoftSkin",
        0xD201 to "DRO",
    )

    fun hex16(v: Int): String = "0x%04X".format(v and 0xFFFF)

    fun hexBytes(b: ByteArray, max: Int = b.size): String =
        b.take(max).joinToString(" ") { "%02X".format(it.toInt() and 0xFF) }
}

class PtpContainer(
    val type: Int,
    val code: Int,
    val txId: Int,
    val params: IntArray,
    val payload: ByteArray,
)

object PtpCodec {
    fun u32le(b: ByteArray, off: Int): Long =
        (b[off].toLong() and 0xFFL) or
            ((b[off + 1].toLong() and 0xFFL) shl 8) or
            ((b[off + 2].toLong() and 0xFFL) shl 16) or
            ((b[off + 3].toLong() and 0xFFL) shl 24)

    fun encodeCommand(code: Int, txId: Int, params: IntArray = IntArray(0)): ByteArray {
        val len = 12 + 4 * params.size
        val bb = ByteBuffer.allocate(len).order(ByteOrder.LITTLE_ENDIAN)
        bb.putInt(len).putShort(Ptp.T_COMMAND.toShort()).putShort(code.toShort()).putInt(txId)
        for (p in params) bb.putInt(p)
        return bb.array()
    }

    fun encodeData(code: Int, txId: Int, payload: ByteArray): ByteArray {
        val len = 12 + payload.size
        val bb = ByteBuffer.allocate(len).order(ByteOrder.LITTLE_ENDIAN)
        bb.putInt(len).putShort(Ptp.T_DATA.toShort()).putShort(code.toShort()).putInt(txId).put(payload)
        return bb.array()
    }

    /** [bytes] must be exactly one container: header plus payload. */
    fun decode(bytes: ByteArray): PtpContainer {
        if (bytes.size < 12) throw PtpFormatException("container ${bytes.size} bytes < 12")
        val len = u32le(bytes, 0)
        if (len != bytes.size.toLong()) throw PtpFormatException("length field $len != ${bytes.size}")
        val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        val type = bb.getShort(4).toInt() and 0xFFFF
        val code = bb.getShort(6).toInt() and 0xFFFF
        val txId = bb.getInt(8)
        val payload = bytes.copyOfRange(12, bytes.size)
        val params = if (type == Ptp.T_DATA) {
            IntArray(0)
        } else {
            val pb = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN)
            IntArray(payload.size / 4) { pb.getInt(it * 4) }
        }
        return PtpContainer(type, code, txId, params, payload)
    }

    /** Dataset from GetObject on the live-view handle: u32 offsetToImage, u32 imageSize, u32 reserved, JPEG. */
    fun liveViewJpeg(data: ByteArray?): ByteArray? {
        if (data == null || data.size < 8) return null
        val off = u32le(data, 0)
        val size = u32le(data, 4)
        if (size == 0L || off + size > data.size) return null
        return data.copyOfRange(off.toInt(), (off + size).toInt())
    }
}

/** Little-endian cursor over a PTP data payload. Every read is bounds-checked. */
class PtpBuf(private val b: ByteArray) {
    var pos = 0
        private set

    val remaining: Int get() = b.size - pos

    private fun need(n: Int) {
        if (n < 0 || pos + n > b.size) throw PtpFormatException("short read at offset $pos (need $n, have $remaining)")
    }

    fun u8(): Int {
        need(1)
        return b[pos++].toInt() and 0xFF
    }

    fun u16(): Int {
        need(2)
        val v = (b[pos].toInt() and 0xFF) or ((b[pos + 1].toInt() and 0xFF) shl 8)
        pos += 2
        return v
    }

    fun u32(): Long {
        val lo = u16().toLong()
        val hi = u16().toLong()
        return lo or (hi shl 16)
    }

    fun u64(): Long {
        val lo = u32()
        val hi = u32()
        return lo or (hi shl 32)
    }

    fun skip(n: Int) {
        need(n)
        pos += n
    }

    fun bytesFrom(start: Int): ByteArray = b.copyOfRange(start, pos)

    fun bytes(n: Int): ByteArray {
        need(n)
        val r = b.copyOfRange(pos, pos + n)
        pos += n
        return r
    }

    /** PTP string: u8 char count including terminator, then UTF-16LE. */
    fun str(): String {
        val n = u8()
        if (n == 0) return ""
        return String(bytes(n * 2), Charsets.UTF_16LE).trimEnd('\u0000')
    }

    /** PTP array header: u32 count, validated against remaining bytes. */
    fun arrayCount(elemSize: Int): Int {
        val at = pos
        val n = u32()
        if (n * elemSize > remaining) throw PtpFormatException("array count $n at offset $at exceeds remaining $remaining")
        return n.toInt()
    }

    fun u16Array(): IntArray {
        val n = arrayCount(2)
        return IntArray(n) { u16() }
    }
}

class PtpDeviceInfo(
    val standardVersion: Int,
    val vendorExtId: Long,
    val vendorExtVersion: Int,
    val vendorExtDesc: String,
    val functionalMode: Int,
    val operations: IntArray,
    val events: IntArray,
    val deviceProps: IntArray,
    val captureFormats: IntArray,
    val imageFormats: IntArray,
    val manufacturer: String,
    val model: String,
    val deviceVersion: String,
    val serialNumber: String,
)

fun parseDeviceInfo(data: ByteArray): PtpDeviceInfo {
    val c = PtpBuf(data)
    return PtpDeviceInfo(
        standardVersion = c.u16(),
        vendorExtId = c.u32(),
        vendorExtVersion = c.u16(),
        vendorExtDesc = c.str(),
        functionalMode = c.u16(),
        operations = c.u16Array(),
        events = c.u16Array(),
        deviceProps = c.u16Array(),
        captureFormats = c.u16Array(),
        imageFormats = c.u16Array(),
        manufacturer = c.str(),
        model = c.str(),
        deviceVersion = c.str(),
        serialNumber = c.str(),
    )
}

class PtpProp(
    val code: Int,
    val dataType: Int,
    val getSet: Int,
    val isEnabled: Int,
    val default: ByteArray,
    val current: ByteArray,
    val formFlag: Int,
)

/** [note] is null on a clean parse; otherwise it says where parsing stopped. */
class PropParse(val props: List<PtpProp>, val note: String?)

/** Fixed size for scalar data types 1..10; -1 otherwise. */
fun valueSize(dt: Int): Int = when (dt) {
    1, 2 -> 1
    3, 4 -> 2
    5, 6 -> 4
    7, 8 -> 8
    9, 10 -> 16
    else -> -1
}

/** Reads one property value of data type [dt]; returns its raw bytes. */
private fun readValue(c: PtpBuf, dt: Int): ByteArray {
    val start = c.pos
    val fixed = valueSize(dt)
    val baseArr = if ((dt and 0x4000) != 0) valueSize(dt and 0x3FFF) else -1
    when {
        fixed > 0 -> c.skip(fixed)
        dt == 0xFFFF -> {
            val n = c.u8()
            c.skip(n * 2)
        }
        baseArr > 0 -> {
            val n = c.arrayCount(baseArr)
            c.skip(n * baseArr)
        }
        else -> throw PtpFormatException("unknown dataType 0x${Integer.toHexString(dt)} at offset $start")
    }
    return c.bytesFrom(start)
}

/**
 * Best-effort parse of SDIO_GetAllExtDevicePropInfo data:
 * u64 count, then per entry: u16 code, u16 dataType, u8 getSet, u8 isEnabled,
 * default, current, u8 formFlag, then range (min, max, step) for 0x01 or enum (u16 n, n values) for 0x02.
 * Stops at the first failure and reports the offset in [PropParse.note].
 */
fun parseAllProps(data: ByteArray): PropParse {
    val c = PtpBuf(data)
    val out = ArrayList<PtpProp>()
    try {
        val declared = c.u64()
        var i = 0L
        while (i < declared) {
            val code = c.u16()
            val dt = c.u16()
            val getSet = c.u8()
            val enabled = c.u8()
            val def = readValue(c, dt)
            val cur = readValue(c, dt)
            val form = c.u8()
            when (form) {
                0x01 -> repeat(3) { readValue(c, dt) }
                0x02 -> {
                    val n = c.u16()
                    repeat(n) { readValue(c, dt) }
                }
            }
            out.add(PtpProp(code, dt, getSet, enabled, def, cur, form))
            i++
        }
        val tail = if (c.remaining > 0) "trailing ${c.remaining} bytes at offset ${c.pos}" else null
        return PropParse(out, tail)
    } catch (e: PtpFormatException) {
        return PropParse(out, "stopped after ${out.size} props: ${e.message}")
    }
}
