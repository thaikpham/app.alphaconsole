// Which USB hint a screen shows, from the USB mode the camera is in. Pure: the screens pass in what they know.
// The write screen asks for PC Remote to be turned off while the camera is in PTP. The preview screen asks for it to be
// turned on whenever the camera is not in PTP, because live view needs PTP.

export type UsbHintMode = "mass-storage" | "ptp" | "unknown";

/** "checking" until the first USB state is known; null when no camera is attached. */
export type UsbHintState = "checking" | null | { mode: UsbHintMode };

export type UsbHint = "ptpOff" | "replug" | "pcRemoteOn" | null;

/**
 * droppedFromPtp: the camera was in PTP and then detached, so PC Remote was turned off and the cable has to be plugged
 * in again. Only the write screen uses it.
 */
export function usbHint(screen: "write" | "preview", usb: UsbHintState, droppedFromPtp = false): UsbHint {
  if (usb === "checking") return null;
  const ptp = usb !== null && usb.mode === "ptp";
  if (screen === "write") {
    if (ptp) return "ptpOff";
    if (usb === null && droppedFromPtp) return "replug";
    return null;
  }
  return ptp ? null : "pcRemoteOn";
}
