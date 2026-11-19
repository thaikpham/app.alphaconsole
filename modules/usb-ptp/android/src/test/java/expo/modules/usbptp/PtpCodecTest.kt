package expo.modules.usbptp

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream

/** Little-endian builder for hand-written PTP payloads. */
private class Le {
    private val out = ByteArrayOutputStream()

    fun u8(v: Int): Le {
        out.write(v and 0xFF)
        return this
    }

    fun u16(v: Int): Le {
        u8(v)
        u8(v shr 8)
        return this
    }

    fun u32(v: Long): Le {
        u16((v and 0xFFFFL).toInt())
        u16(((v shr 16) and 0xFFFFL).toInt())
        return this
    }

    fun u32(v: Int): Le = u32(v.toLong())

    fun u64(v: Long): Le {
        u32(v and 0xFFFFFFFFL)
        u32((v shr 32) and 0xFFFFFFFFL)
        return this
    }

    /** PTP string: count including terminator, then UTF-16LE. Empty string is a single 0 byte. */
    fun str(s: String): Le {
        if (s.isEmpty()) return u8(0)
        val chars = s + "\u0000"
        u8(chars.length)
        for (c in chars) u16(c.code)
        return this
    }

    fun raw(b: ByteArray): Le {
        out.write(b)
        return this
    }

    fun bytes(): ByteArray = out.toByteArray()
}

class PtpCodecTest {

    @Test
    fun commandHeaderIsLittleEndian() {
        val b = PtpCodec.encodeCommand(0x1002, 0, intArrayOf(1))
        assertArrayEquals(
            byteArrayOf(0x10, 0, 0, 0, 0x01, 0x00, 0x02, 0x10, 0, 0, 0, 0, 1, 0, 0, 0),
            b,
        )
    }

    @Test
    fun commandRoundTripsThroughDecode() {
        val c = PtpCodec.decode(PtpCodec.encodeCommand(0x9201, 7, intArrayOf(1, 0, 0)))
        assertEquals(Ptp.T_COMMAND, c.type)
        assertEquals(0x9201, c.code)
        assertEquals(7, c.txId)
        assertArrayEquals(intArrayOf(1, 0, 0), c.params)
    }

    @Test(expected = PtpFormatException::class)
    fun decodeRejectsLengthMismatch() {
        val b = PtpCodec.encodeCommand(0x1001, 0)
        b[0] = 99
        PtpCodec.decode(b)
    }

    @Test(expected = PtpFormatException::class)
    fun decodeRejectsShortInput() {
        PtpCodec.decode(ByteArray(8))
    }

    @Test
    fun deviceInfoParsesHandBuiltBlock() {
        val data = Le()
            .u16(0x0100)
            .u32(0x0000000AL)
            .u16(100)
            .str("")
            .u16(0)
            .u32(2).u16(0x1001).u16(0x1002)
            .u32(0)
            .u32(0)
            .u32(0)
            .u32(0)
            .str("Sony")
            .str("ZV-E10")
            .str("")
            .str("")
            .bytes()
        val d = parseDeviceInfo(data)
        assertEquals(0x0100, d.standardVersion)
        assertEquals("Sony", d.manufacturer)
        assertEquals("ZV-E10", d.model)
        assertArrayEquals(intArrayOf(0x1001, 0x1002), d.operations)
    }

    /** Four entries: uint8 plain, uint32 with range form, string with no form, uint8 array. */
    private fun propBlock(): ByteArray {
        val b = Le().u64(4)
        b.u16(0x5001).u16(0x0002).u8(0).u8(1).u8(1).u8(2).u8(0)
        b.u16(0xD20D).u16(0x0006).u8(1).u8(1).u32(0x10).u32(0x20).u8(0x01).u32(0x10).u32(0x40).u32(0x10)
        b.u16(0xD178).u16(0xFFFF).u8(0).u8(1).str("").str("AB").u8(0)
        b.u16(0x500A).u16(0x4002).u8(0).u8(1).u32(1).u8(7).u32(2).u8(8).u8(9).u8(0)
        return b.bytes()
    }

    @Test
    fun allPropsParsesFourEntries() {
        val r = parseAllProps(propBlock())
        assertNull(r.note)
        assertEquals(4, r.props.size)
        assertEquals(2, r.props[0].current[0].toInt())
        assertEquals(0x01, r.props[1].formFlag)
        assertEquals(0xFFFF, r.props[2].dataType)
        assertEquals(0x4002, r.props[3].dataType)
        assertEquals(6, r.props[3].current.size)
    }

    @Test
    fun allPropsReturnsPartialWithNoteOnTruncation() {
        val full = propBlock()
        val r = parseAllProps(full.copyOf(full.size - 1))
        assertEquals(3, r.props.size)
        assertNotNull(r.note)
        assertTrue(r.note.orEmpty().startsWith("stopped after 3 props"))
    }

    @Test
    fun liveViewJpegSlicesByHeader() {
        val jpeg = byteArrayOf(-1, -40, 0x11, -1, -39)
        val frame = Le().u32(12).u32(jpeg.size).u32(0).raw(jpeg).bytes()
        assertArrayEquals(jpeg, PtpCodec.liveViewJpeg(frame))
        assertNull(PtpCodec.liveViewJpeg(null))
        assertNull(PtpCodec.liveViewJpeg(Le().u32(12).u32(0).u32(0).bytes()))
        assertNull(PtpCodec.liveViewJpeg(Le().u32(12).u32(100).u32(0).raw(jpeg).bytes()))
    }

    @Test
    fun scalarValueReadsUnsignedAndSignedTypes() {
        assertEquals(255L, scalarValue(2, byteArrayOf(0xFF.toByte())))
        assertEquals(-1L, scalarValue(1, byteArrayOf(0xFF.toByte())))
        assertEquals(-2L, scalarValue(3, byteArrayOf(0xFE.toByte(), 0xFF.toByte())))
        assertEquals(4294967295L, scalarValue(6, byteArrayOf(-1, -1, -1, -1)))
        assertEquals(-1L, scalarValue(5, byteArrayOf(-1, -1, -1, -1)))
    }

    @Test
    fun scalarValueIsNullWhenNotRepresentable() {
        assertNull(scalarValue(8, byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0x80.toByte())))
        assertNull(scalarValue(6, byteArrayOf(0, 0)))
        assertNull(scalarValue(0x4002, byteArrayOf(0, 0, 0, 0, 0, 0)))
        assertNull(scalarValue(0xFFFF, byteArrayOf(0)))
    }

    @Test
    fun propRowCarriesScalarsAndNullsOthers() {
        val props = parseAllProps(propBlock()).props
        assertEquals(2.0, props[0].toRow().current)
        assertEquals(32.0, props[1].toRow().current)
        assertNull(props[2].toRow().current)
        assertNull(props[3].toRow().current)
    }
}
