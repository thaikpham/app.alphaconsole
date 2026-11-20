// Display settings the user sets once on the camera. Memory Recall (M1–M4) does not store them, so the app cannot write them.
// Pure TS: not in SlotSettings, not in STAGE_ROWS, never written to the DAT and never counted as modified.
// Labels, value text and menu paths are in content.ts (content.fixedDisplay).

export type FixedDisplayId = "displayQuality" | "monitorBrightness" | "autoPowerOffTemp";

/** Value codes. The text is in content.fixedDisplay.values. */
export type FixedDisplayValue = "high" | "sunny-weather";

export type FixedDisplayItem = { id: FixedDisplayId; value: FixedDisplayValue };

/** Same values for every slot. The slot editor shows them read-only in the Hiển thị stage. */
export const FIXED_DISPLAY: readonly FixedDisplayItem[] = [
  { id: "displayQuality", value: "high" },
  { id: "monitorBrightness", value: "sunny-weather" },
  { id: "autoPowerOffTemp", value: "high" },
];
