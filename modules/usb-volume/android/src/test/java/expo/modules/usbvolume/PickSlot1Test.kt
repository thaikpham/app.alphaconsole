package expo.modules.usbvolume

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PickSlot1Test {
    private val cardBytes = 32L * 1024 * 1024 * 1024
    private val pmhomeBytes = 64L * 1024 * 1024

    private fun probe(uuid: String, sony: Boolean, bytes: Long) = VolumeProbe(uuid, sony, bytes, uuid)

    @Test
    fun firstSonyCardInStorageOrderWins() {
        val picked = pickSlot1(listOf(probe("AAAA-1111", true, cardBytes), probe("BBBB-2222", true, cardBytes)))
        assertEquals("AAAA-1111", picked?.uuid)
    }

    @Test
    fun skipsVolumeWithoutSonyMarker() {
        val picked = pickSlot1(listOf(probe("AAAA-1111", false, cardBytes), probe("BBBB-2222", true, cardBytes)))
        assertEquals("BBBB-2222", picked?.uuid)
    }

    @Test
    fun skipsPmhomeSizedVolumeEvenWhenItHasMarker() {
        val picked = pickSlot1(listOf(probe("PMHOME-64", true, pmhomeBytes), probe("BBBB-2222", true, cardBytes)))
        assertEquals("BBBB-2222", picked?.uuid)
    }

    @Test
    fun acceptsVolumeAtMinimumCardSize() {
        val picked = pickSlot1(listOf(probe("AAAA-1111", true, MIN_CARD_BYTES)))
        assertEquals("AAAA-1111", picked?.uuid)
    }

    @Test
    fun returnsNullWhenNoCardIsPresent() {
        assertNull(pickSlot1(emptyList<VolumeProbe<String>>()))
        assertNull(pickSlot1(listOf(probe("AAAA-1111", false, cardBytes), probe("PMHOME-64", true, pmhomeBytes))))
    }
}
