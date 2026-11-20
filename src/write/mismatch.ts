// Mismatch line for the preview screen (SPEC screen 6): each field the camera reads differently from the selected slot,
// as "readback → slot". Pure: no native or React imports.
import type { PreviewField, SlotCheck } from "../core/web/lib/app-core/preview/match.ts";
import { formatCells, type PreviewLabels, type PreviewReadings } from "../core/web/lib/app-core/preview/props.ts";
import type { SlotDraft } from "../core/web/lib/presetSets.ts";

const FIELDS: readonly PreviewField[] = ["mode", "aperture", "shutter", "iso", "wb", "focus", "metering", "pp"];
const MISSING = "—";

// The expected PP state, with the same rule as match.ts: ppOn false is off; ppOn true, or a pp record, selects PP1.
function slotPp(s: SlotDraft): number | undefined {
  if (s.ppOn === false) return 0;
  if (s.ppOn === true) return 1;
  if (typeof s.pp === "object" && Object.keys(s.pp).length > 0) return 1;
  return undefined;
}

// The slot's own value for one field, written the way formatCells writes the camera's value.
function slotText(field: PreviewField, s: SlotDraft, labels: PreviewLabels): string {
  switch (field) {
    case "mode":
      return s.mode && s.mode !== "keep" ? s.mode : MISSING;
    case "aperture":
      return s.aperture === undefined || s.aperture === "keep" ? MISSING : `F${Number(s.aperture)}`;
    case "shutter":
      return s.shutter === undefined || s.shutter === "keep" ? MISSING : s.shutter;
    case "iso":
      if (s.iso === undefined || s.iso === "keep") return MISSING;
      return `ISO ${typeof s.iso === "number" ? s.iso : s.iso.toUpperCase()}`;
    case "wb":
      if (!s.wb || s.wb === "keep") return MISSING;
      return s.wb.mode === "ctemp" ? `${s.wb.kelvin}K` : labels.wb[s.wb.mode];
    case "focus":
      return !s.focus || s.focus === "keep" ? MISSING : labels.focus[s.focus];
    case "metering":
      if (!s.metering || s.metering === "keep") return MISSING;
      return s.metering === "multi" ? labels.metering.multi : s.metering;
    case "pp": {
      const pp = slotPp(s);
      if (pp === undefined) return MISSING;
      return pp === 0 ? labels.ppOff : `PP${pp}`;
    }
  }
}

/**
 * The fields that differ, as "readback → slot" joined with " · ", in field order. Only fields the slot sets are listed
 * (check.fields). Null when nothing differs.
 */
export function mismatchSummary(
  readings: PreviewReadings,
  slot: SlotDraft,
  check: SlotCheck,
  labels: PreviewLabels,
): string | null {
  if (check.mismatches === 0) return null;
  const cells = formatCells(readings, labels);
  const parts = FIELDS.filter((field) => check.fields[field] === "mismatch").map(
    (field) => `${cells[field]} → ${slotText(field, slot, labels)}`,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}
