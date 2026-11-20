// Settings line for the iOS preview screen (SPEC-IOS §4.9, O19): six values in one row, separated by " · ".
// A value the selected slot compares and the camera does not match reads "readback→slot" and is flagged warn.
// Pure: no native or React imports. The slot text repeats the private slotText in src/write/mismatch.ts (src/write is not editable from here).
import type { SlotCheck } from "../core/web/lib/app-core/preview/match.ts";
import type { PreviewLabels, PreviewReadings, Reading } from "../core/web/lib/app-core/preview/props.ts";
import type { SlotDraft } from "../core/web/lib/presetSets.ts";

export type SummaryKey = "mode" | "aperture" | "shutter" | "iso" | "wb" | "pp";

/** Left to right on the settings line. */
export const SUMMARY_KEYS: readonly SummaryKey[] = ["mode", "aperture", "shutter", "iso", "wb", "pp"];

export type SummarySegment = { text: string; warn: boolean };

const MISSING = "—";
const hex = (raw: number) => `0x${raw.toString(16).toUpperCase()}`;

function show<T>(reading: Reading<T>, value: (v: T) => string): string {
  if (reading.kind === "missing") return MISSING;
  if (reading.kind === "raw") return hex(reading.raw);
  return value(reading.value);
}

// The camera's value for one key.
function readback(key: SummaryKey, r: PreviewReadings, labels: PreviewLabels): string {
  switch (key) {
    case "mode":
      return show(r.mode, (v) => v);
    case "aperture":
      return show(r.aperture, (v) => `f/${v}`);
    case "shutter":
      return show(r.shutter, (v) => v);
    case "iso":
      return show(r.iso, (v) => `ISO ${v === "AUTO" ? "Auto" : v}`);
    case "wb":
      return show(r.wb, (v) => (v === "ctemp" ? show(r.kelvin, (k) => `${k}K`) : labels.wb[v]));
    case "pp":
      return show(r.pp, (v) => (v === 0 ? labels.ppOff : `PP${v}`));
  }
}

// The same rule as match.ts: ppOn false is off; ppOn true, or a pp record, selects PP1.
function slotPp(s: SlotDraft): number | undefined {
  if (s.ppOn === false) return 0;
  if (s.ppOn === true) return 1;
  if (typeof s.pp === "object" && Object.keys(s.pp).length > 0) return 1;
  return undefined;
}

// The slot's value for one key, written the way readback writes the camera's.
function slotValue(key: SummaryKey, s: SlotDraft, labels: PreviewLabels): string {
  switch (key) {
    case "mode":
      return s.mode && s.mode !== "keep" ? s.mode : MISSING;
    case "aperture":
      return s.aperture === undefined || s.aperture === "keep" ? MISSING : `f/${Number(s.aperture)}`;
    case "shutter":
      return s.shutter === undefined || s.shutter === "keep" ? MISSING : s.shutter;
    case "iso":
      if (s.iso === undefined || s.iso === "keep") return MISSING;
      return `ISO ${typeof s.iso === "number" ? s.iso : "Auto"}`;
    case "wb":
      if (!s.wb || s.wb === "keep") return MISSING;
      return s.wb.mode === "ctemp" ? `${s.wb.kelvin}K` : labels.wb[s.wb.mode];
    case "pp": {
      const pp = slotPp(s);
      if (pp === undefined) return MISSING;
      return pp === 0 ? labels.ppOff : `PP${pp}`;
    }
  }
}

/**
 * The six segments in SUMMARY_KEYS order. Without a slot or a check nothing is flagged.
 */
export function settingsLine(
  readings: PreviewReadings,
  labels: PreviewLabels,
  slot: SlotDraft | null,
  check: SlotCheck | null,
): SummarySegment[] {
  return SUMMARY_KEYS.map((key) => {
    const camera = readback(key, readings, labels);
    if (!slot || check?.fields[key] !== "mismatch") return { text: camera, warn: false };
    return { text: `${camera}→${slotValue(key, slot, labels)}`, warn: true };
  });
}
