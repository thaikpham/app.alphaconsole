/** Sheet detent heights (SPEC-IOS §6, O6; SPEC §2.5 on Android). Pure, with no imports, so `node --experimental-strip-types` can test it. */
/** A named detent, or a fixed height in px (Android: camera sheet 600, create sheet 860). */
export type Detent = "medium" | "large" | number;

/**
 * medium = 440 pt, clamped to the window (AlphaIOS.dc.html sheet). large = window minus the top inset and 8 pt.
 * A number is a fixed height, clamped to the window. All clamp at 0.
 */
export function detentHeight(detent: Detent, windowHeight: number, topInset: number): number {
  if (typeof detent === "number") return Math.max(0, Math.min(detent, windowHeight));
  if (detent === "medium") return Math.max(0, Math.min(440, windowHeight));
  return Math.max(0, windowHeight - topInset - 8);
}
