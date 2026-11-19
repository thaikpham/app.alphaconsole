// The one-line camera status on the home screen. Pure: picks the state from the USB mode, the card reading and the mount wait.
// The screen turns each kind into Vietnamese copy.
import type { Family } from "@/core/transfer/plan";
import type { UsbDevice } from "../../modules/usb-volume";
import type { CardReading } from "./session";

export type UsbStatus = UsbDevice | null | "checking";

export type CardLine =
  | { kind: "checking" }
  | { kind: "unplugged" }
  | { kind: "ptp" }
  | { kind: "unknownMode" }
  | { kind: "reading" }
  | { kind: "mounting" }
  | { kind: "absent" }
  | { kind: "unformatted" }
  | { kind: "noSlots" }
  | { kind: "broken"; message: string }
  | { kind: "ready"; family: Family; currentName: string | null }
  | { kind: "readOnly"; name: string }
  | { kind: "unsupported"; name: string };

/**
 * [reading] is null while a read is in progress, so a busy screen shows "reading" rather than the last result.
 * [waiting] is true from a mass-storage attach until the card is found: until then an absent card shows "mounting".
 */
export function cardLine(usb: UsbStatus, reading: CardReading | null, waiting: boolean): CardLine {
  if (usb === "checking") return { kind: "checking" };
  if (usb === null) return { kind: "unplugged" };
  if (usb.mode === "ptp") return { kind: "ptp" };
  if (usb.mode !== "mass-storage") return { kind: "unknownMode" };
  if (reading === null) return waiting ? { kind: "mounting" } : { kind: "reading" };
  switch (reading.kind) {
    case "absent":
      return waiting ? { kind: "mounting" } : { kind: "absent" };
    case "noSony":
      return { kind: "unformatted" };
    case "ready": {
      const { view, matched } = reading.card;
      if (view.error !== null) return { kind: "broken", message: view.error };
      if (view.family === null) return { kind: "noSlots" };
      return { kind: "ready", family: view.family, currentName: matched?.name ?? null };
    }
    case "readOnly":
      return { kind: "readOnly", name: reading.model.name };
    case "unsupported":
      return { kind: "unsupported", name: reading.model.name };
  }
}
