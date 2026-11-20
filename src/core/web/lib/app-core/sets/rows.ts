// Rows of the slot editor: one row per setting, with its options, read and write rules, and the Như máy (held) model.
// kelvin, ab and gm are parts of the wb object. A row is held when its field is absent or "keep" (SPEC 7.2).
// Values are strings, as readRow returns them. Labels are in content.ts.
import { PP_FIELDS, type SlotSettings, type WB } from "../../zve10/dat.ts";
import type { SlotDraft } from "../../presetSets.ts";
import {
  AB_GM_RANGE,
  APERTURE_OPTIONS,
  ENUM_OPTIONS,
  FOCUS_OPTIONS,
  ISO_OPTIONS,
  KELVIN_RANGE,
  MODE_OPTIONS,
  SHUTTER_OPTIONS,
  WB_MODE_OPTIONS,
  rangeValues,
} from "./options.ts";
import { canonical, setPp } from "./draft.ts";

export const DEFAULT_KELVIN = 5500;
/** Rows with this many options or fewer use a segmented control in the row sheet. More use a stepper. */
export const SEGMENT_LIMIT = 4;
/** PP banks: bank 1 is slot.pp, banks 2–10 are slot.ppBanks. */
export const PP_BANKS: readonly number[] = Array.from({ length: 10 }, (_, i) => i + 1);

export type RowId =
  | "mode"
  | "aperture"
  | "shutter"
  | "iso"
  | "metering"
  | "expCompSet"
  | "flashMode"
  | "steadyShot"
  | "eFrontCurtain"
  | "focus"
  | "focusArea"
  | "facePriority"
  | "preAF"
  | "wb"
  | "kelvin"
  | "ab"
  | "gm"
  | "awbPriority"
  | "softSkin"
  | "autoReview"
  | "liveView";

/** Rows of each stage. advanced sits under a collapsed "Nâng cao" disclosure. Order is the display order. */
export const STAGE_ROWS: readonly { main: readonly RowId[]; advanced: readonly RowId[] }[] = [
  {
    main: ["mode", "aperture", "shutter", "iso", "metering"],
    advanced: ["expCompSet", "flashMode", "steadyShot", "eFrontCurtain"],
  },
  { main: ["focus", "focusArea", "facePriority", "preAF"], advanced: [] },
  { main: ["wb", "kelvin", "ab", "gm", "awbPriority", "softSkin"], advanced: [] },
  { main: ["autoReview", "liveView"], advanced: [] },
];

/** The SlotSettings field each row reads and writes. kelvin, ab and gm are parts of wb. */
export const ROW_FIELD: Record<RowId, keyof SlotSettings> = {
  mode: "mode",
  aperture: "aperture",
  shutter: "shutter",
  iso: "iso",
  metering: "metering",
  expCompSet: "expCompSet",
  flashMode: "flashMode",
  steadyShot: "steadyShot",
  eFrontCurtain: "eFrontCurtain",
  focus: "focus",
  focusArea: "focusArea",
  facePriority: "facePriority",
  preAF: "preAF",
  wb: "wb",
  kelvin: "wb",
  ab: "wb",
  gm: "wb",
  awbPriority: "awbPriority",
  softSkin: "softSkin",
  autoReview: "autoReview",
  liveView: "liveView",
};

const KELVIN_VALUES = rangeValues(KELVIN_RANGE.min, KELVIN_RANGE.max, KELVIN_RANGE.step).map(String);
const SHIFT_VALUES = rangeValues(AB_GM_RANGE.min, AB_GM_RANGE.max, AB_GM_RANGE.step).map(String);

/** Option values of each row. ISO Auto is not here: the row sheet has its own switch for it. */
const OPTIONS: Record<RowId, readonly string[]> = {
  mode: MODE_OPTIONS,
  aperture: APERTURE_OPTIONS,
  shutter: SHUTTER_OPTIONS,
  iso: ISO_OPTIONS,
  metering: ENUM_OPTIONS.metering,
  expCompSet: ENUM_OPTIONS.expCompSet,
  flashMode: ENUM_OPTIONS.flashMode,
  steadyShot: ENUM_OPTIONS.steadyShot,
  eFrontCurtain: ENUM_OPTIONS.eFrontCurtain,
  focus: FOCUS_OPTIONS,
  focusArea: ENUM_OPTIONS.focusArea,
  facePriority: ENUM_OPTIONS.facePriority,
  preAF: ENUM_OPTIONS.preAF,
  wb: WB_MODE_OPTIONS,
  kelvin: KELVIN_VALUES,
  ab: SHIFT_VALUES,
  gm: SHIFT_VALUES,
  awbPriority: ENUM_OPTIONS.awbPriority,
  softSkin: ENUM_OPTIONS.softSkin,
  autoReview: ENUM_OPTIONS.autoReview,
  liveView: ENUM_OPTIONS.liveView,
};

export function rowOptions(id: RowId): readonly string[] {
  return OPTIONS[id];
}

export function usesStepper(id: RowId): boolean {
  return OPTIONS[id].length > SEGMENT_LIMIT;
}

/** Options of one PP parameter: enum values, or every value from min to max by step. */
export function ppOptions(field: (typeof PP_FIELDS)[number]): readonly string[] {
  if (field.kind === "enum") return field.options ?? [];
  if (field.min === undefined || field.max === undefined || field.step === undefined) return [];
  return rangeValues(field.min, field.max, field.step).map(String);
}

function wbObject(slot: SlotDraft): WB | undefined {
  return typeof slot.wb === "object" ? slot.wb : undefined;
}

function fieldText(value: unknown): string | undefined {
  return value === undefined || value === "keep" ? undefined : String(value);
}

/** Whether a row shows for this slot. kelvin needs wb in ctemp mode. ab and gm need a wb object. */
export function rowVisible(slot: SlotDraft, id: RowId): boolean {
  const wb = wbObject(slot);
  if (id === "kelvin") return wb?.mode === "ctemp";
  if (id === "ab" || id === "gm") return wb !== undefined;
  return true;
}

/** Current value of a row, or undefined when the row is held (absent or "keep"). */
export function readRow(slot: SlotDraft, id: RowId): string | undefined {
  const wb = wbObject(slot);
  switch (id) {
    case "wb":
      return wb?.mode;
    case "kelvin":
      return wb?.mode === "ctemp" ? fieldText(wb.kelvin) : undefined;
    case "ab":
      return wb ? String(wb.ab ?? 0) : undefined;
    case "gm":
      return wb ? String(wb.gm ?? 0) : undefined;
    default:
      return fieldText(slot[ROW_FIELD[id]]);
  }
}

function setField(slot: SlotDraft, key: keyof SlotSettings, value: unknown): SlotDraft {
  const next: Record<string, unknown> = { ...slot };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next as SlotDraft;
}

function writeWbMode(slot: SlotDraft, mode: string | undefined): SlotDraft {
  if (mode === undefined) return setField(slot, "wb", undefined);
  if (mode !== "awb" && mode !== "ctemp") return slot;
  const cur = wbObject(slot);
  const priority = cur?.priority !== undefined ? { priority: cur.priority } : {};
  const ab = cur?.ab ?? 0;
  const gm = cur?.gm ?? 0;
  const wb: WB =
    mode === "ctemp"
      ? { mode, kelvin: cur?.kelvin ?? DEFAULT_KELVIN, ab, gm, ...priority }
      : { mode, ab, gm, ...priority };
  return setField(slot, "wb", wb);
}

/** kelvin, ab and gm cannot be held. undefined is a no-op, and kelvin is a no-op outside ctemp. */
function writeWbPart(slot: SlotDraft, id: "kelvin" | "ab" | "gm", value: string | undefined): SlotDraft {
  const cur = wbObject(slot);
  if (!cur || value === undefined) return slot;
  const n = Number(value);
  if (id === "kelvin") return cur.mode === "ctemp" ? setField(slot, "wb", { ...cur, kelvin: n }) : slot;
  if (id === "ab") return setField(slot, "wb", { ...cur, ab: n });
  return setField(slot, "wb", { ...cur, gm: n });
}

/** Sets a row from its string value. undefined holds the row (Như máy). Returns a new slot. */
export function writeRow(slot: SlotDraft, id: RowId, value: string | undefined): SlotDraft {
  if (id === "wb") return writeWbMode(slot, value);
  if (id === "kelvin" || id === "ab" || id === "gm") return writeWbPart(slot, id, value);
  return setField(slot, ROW_FIELD[id], value);
}

/** Label of an A-B or G-M shift. A and G are below zero, B and M above it (codec: +M, −G). */
export function formatShift(axis: "ab" | "gm", n: number): string {
  if (n === 0) return "0";
  const side = n < 0 ? (axis === "ab" ? "A" : "G") : axis === "ab" ? "B" : "M";
  return `${side}${Math.abs(n)}`;
}

/** True when a row reads differently in the draft than in the saved slot. */
export function isRowModified(saved: SlotDraft, draft: SlotDraft, id: RowId): boolean {
  return readRow(saved, id) !== readRow(draft, id);
}

/** True when a slot differs from its saved settings. Drives the ModifiedDot on SlotChips. */
export function isSlotModified(saved: SlotDraft, draft: SlotDraft): boolean {
  return canonical(saved) !== canonical(draft);
}

/** Sets a row in every slot where it shows. Slots where it does not show are left unchanged (SPEC 7.3). */
export function applyToAll(slots: readonly SlotDraft[], id: RowId, value: string | undefined): SlotDraft[] {
  return slots.map((slot) => (rowVisible(slot, id) ? writeRow(slot, id, value) : slot));
}

/** Replaces one slot with its saved settings (Đặt lại về bản gốc). The other slots are unchanged. */
export function resetSlot(draft: readonly SlotDraft[], saved: readonly SlotDraft[], index: number): SlotDraft[] {
  return draft.map((slot, i) => (i === index ? { ...saved[index] } : slot));
}

/** Settings of one PP bank, or undefined when the bank holds nothing. */
export function readBank(slot: SlotDraft, bank: number): Record<string, unknown> | undefined {
  if (bank === 1) return typeof slot.pp === "object" ? slot.pp : undefined;
  return slot.ppBanks?.[bank];
}

/** Value of one PP parameter in a bank as a string, or undefined when held (Như máy). */
export function readPp(slot: SlotDraft, bank: number, key: string): string | undefined {
  return fieldText(readBank(slot, bank)?.[key]);
}

/** True when a PP bank differs from its saved settings. Drives the ModifiedDot on the PP chips. */
export function isBankModified(saved: SlotDraft, draft: SlotDraft, bank: number): boolean {
  return canonical(readBank(saved, bank)) !== canonical(readBank(draft, bank));
}

/**
 * Sets one PP parameter in a bank. undefined holds it. Bank 1 is pp and goes through setPp (recipeId "custom").
 * Banks 2–10 are ppBanks. Editing a bank drops its recipe id (bankIds). Empty banks are removed.
 */
export function writePp(slot: SlotDraft, bank: number, key: string, value: string | undefined): SlotDraft {
  const field = PP_FIELDS.find((f) => f.key === key);
  const v = value !== undefined && field?.kind === "int" ? Number(value) : value;
  if (bank === 1) return setPp(slot, key, v);
  const params: Record<string, unknown> = { ...slot.ppBanks?.[bank] };
  if (v === undefined) delete params[key];
  else params[key] = v;
  const ppBanks: Partial<Record<number, Record<string, unknown>>> = { ...slot.ppBanks };
  if (Object.keys(params).length === 0) delete ppBanks[bank];
  else ppBanks[bank] = params;
  const bankIds: Partial<Record<number, string>> = { ...slot.bankIds };
  delete bankIds[bank];
  const next: SlotDraft = { ...slot, ppBanks, bankIds };
  if (Object.keys(ppBanks).length === 0) delete next.ppBanks;
  if (Object.keys(bankIds).length === 0) delete next.bankIds;
  return next;
}
