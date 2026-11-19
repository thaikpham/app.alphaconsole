// Timing logs for the card read, tag ReactNativeJS in logcat. CARD_DEBUG is the one switch for the JS side; it stays on for the beta.
// The native side has its own switch, ACL_DEBUG in modules/usb-volume/.../Acl.kt. Logs carry no card contents.
import { recordAcl } from "@/crash/ring";

export const CARD_DEBUG = true;

/** One ACL line. The logcat line carries the time, so a line also marks when the event happened. The line is also kept for the crash log. */
export function aclLog(message: string): void {
  const line = `ACL ${message}`;
  recordAcl(line);
  if (CARD_DEBUG) console.log(line);
}

/** One ACL line with the ms elapsed since [since] (a Date.now() value). */
export function aclLap(label: string, since: number): void {
  aclLog(`${label} ${Date.now() - since} ms`);
}
