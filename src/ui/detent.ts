/** Sheet detent heights (SPEC-IOS §6, O6). Pure, with no imports, so `node --experimental-strip-types` can test it. */
export type Detent = "medium" | "large";

/** medium = 440 pt, clamped to the window (AlphaIOS.dc.html sheet). large = window minus the top inset and 8 pt. Both clamp at 0. */
export function detentHeight(detent: Detent, windowHeight: number, topInset: number): number {
  if (detent === "medium") return Math.max(0, Math.min(440, windowHeight));
  return Math.max(0, windowHeight - topInset - 8);
}
