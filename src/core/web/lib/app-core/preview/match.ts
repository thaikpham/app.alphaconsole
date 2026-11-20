// Compares the camera's readings with the four slots of a set. Pure.
// Only the fields a slot sets are compared: "keep" and unset fields are skipped. A raw or missing camera value never matches.
// focusArea and softSkin are not compared (their codes are unverified).
import type { SlotDraft } from "../../presetSets.ts";
import { readPreview, type PreviewReadings, type PtpProp, type Reading } from "./props.ts";

/** Anything with slot settings in order. A PresetSet fits; so does a shorter list. */
export interface SlotSource {
  readonly slots: readonly { readonly settings: SlotDraft }[];
}

export type PreviewField = "mode" | "aperture" | "shutter" | "iso" | "wb" | "focus" | "metering" | "pp";
export type FieldState = "match" | "mismatch";

export interface SlotCheck {
  index: number;
  /** Compared fields only. A field absent here was "keep" or unset in the slot. */
  fields: Partial<Record<PreviewField, FieldState>>;
  compared: number;
  mismatches: number;
}

export interface MatchResult {
  /** Lowest index whose compared fields all match, with at least one compared. */
  matched: number | null;
  /** Fewest mismatches, lowest index on ties. Drives the warning colours. Null when no slot has a compared field. */
  nearest: number | null;
  slots: SlotCheck[];
}

const value = <T>(reading: Reading<T>): T | undefined => (reading.kind === "value" ? reading.value : undefined);

const known = <T>(v: T | "keep" | undefined): T | undefined => (v === undefined || v === "keep" ? undefined : v);

// A slot ISO is a number, "auto", or a numeric string. The camera reports "AUTO" or the number as text.
const isoText = (v: number | string): string => (typeof v === "number" ? String(v) : v.toUpperCase());

// Expected PP state (0 off, 1 PP1), using the codec's write rule (dat.ts applySettings): ppOn false is off; ppOn true,
// or a pp record with values, selects PP1. Undefined when the slot leaves PP alone.
const slotPp = (s: SlotDraft): number | undefined => {
  if (s.ppOn === false) return 0;
  if (s.ppOn === true) return 1;
  if (typeof s.pp === "object" && Object.keys(s.pp).length > 0) return 1;
  return undefined;
};

function checkSlot(r: PreviewReadings, s: SlotDraft, index: number): SlotCheck {
  const fields: SlotCheck["fields"] = {};
  const put = (field: PreviewField, ok: boolean) => {
    fields[field] = ok ? "match" : "mismatch";
  };

  const mode = known(s.mode);
  if (mode !== undefined) put("mode", value(r.mode) === mode);

  const aperture = known(s.aperture);
  if (aperture !== undefined) {
    const shown = value(r.aperture);
    put("aperture", shown !== undefined && Number(shown) === Number(aperture));
  }

  const shutter = known(s.shutter);
  if (shutter !== undefined) put("shutter", value(r.shutter) === shutter);

  const iso = known(s.iso);
  if (iso !== undefined) put("iso", value(r.iso) === isoText(iso));

  if (s.wb !== undefined && s.wb !== "keep") {
    const wb = s.wb;
    put("wb", value(r.wb) === wb.mode && (wb.mode !== "ctemp" || value(r.kelvin) === wb.kelvin));
  }

  const focus = known(s.focus);
  if (focus !== undefined) put("focus", value(r.focus) === focus);

  const metering = known(s.metering);
  if (metering !== undefined) put("metering", value(r.metering) === metering);

  const pp = slotPp(s);
  if (pp !== undefined) put("pp", value(r.pp) === pp);

  const states = Object.values(fields);
  return { index, fields, compared: states.length, mismatches: states.filter((x) => x === "mismatch").length };
}

export function matchSlot(props: readonly PtpProp[], set: SlotSource): MatchResult {
  const readings = readPreview(props);
  const slots = set.slots.map((slot, index) => checkSlot(readings, slot.settings, index));
  const matched = slots.find((s) => s.compared > 0 && s.mismatches === 0)?.index ?? null;
  let nearest: number | null = null;
  for (const s of slots) {
    if (s.compared === 0) continue;
    if (nearest === null || s.mismatches < slots[nearest].mismatches) nearest = s.index;
  }
  return { matched, nearest, slots };
}
