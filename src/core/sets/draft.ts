// Editor model for one preset set: field-to-stage grouping, immutable slot setters, changed-stage marks,
// and validation (validatePresetSets, then a codec dry run of every slot on both bases).
import { applySettings } from "../web/lib/zve10/dat.ts";
import { PresetError, validatePresetSets, type PresetSet, type SlotDraft } from "../web/lib/presetSets.ts";
import { loadBase, type System } from "../bases.ts";

export type SlotNumber = 1 | 2 | 3 | 4;

/** Editor stages in order. Stage titles are in content.ts (stages). */
export const STAGE_FIELDS: readonly (readonly (keyof SlotDraft)[])[] = [
  ["mode", "aperture", "shutter", "iso", "metering", "expCompSet", "flashMode", "steadyShot", "eFrontCurtain"],
  ["focus", "focusArea", "facePriority", "preAF"],
  ["wb", "awbPriority", "softSkin", "pp", "ppOn", "recipeId", "ppBanks", "bankIds"],
  ["autoReview", "liveView"],
];

export function stageOfField(field: string): number | null {
  const i = STAGE_FIELDS.findIndex((fields) => (fields as readonly string[]).includes(field));
  return i < 0 ? null : i;
}

/** Sets one field of a slot. undefined removes it, which means "keep" in the file. Returns a new object. */
export function setSetting<K extends keyof SlotDraft>(slot: SlotDraft, key: K, value: SlotDraft[K] | undefined): SlotDraft {
  const next = { ...slot };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** Sets one PP field. Setting any PP field marks the slot as a custom recipe. When no PP field is left, pp and recipeId are removed. */
export function setPp(slot: SlotDraft, key: string, value: string | number | undefined): SlotDraft {
  const pp: Record<string, unknown> = typeof slot.pp === "object" ? { ...slot.pp } : {};
  if (value === undefined) delete pp[key];
  else pp[key] = value;
  if (Object.keys(pp).length === 0) return clearPp(slot);
  return { ...slot, pp, recipeId: "custom" };
}

/** Removes all PP settings from the slot (keep). */
export function clearPp(slot: SlotDraft): SlotDraft {
  const next = { ...slot };
  delete next.pp;
  delete next.recipeId;
  return next;
}

/**
 * Comparable form of a value: keys sorted, undefined and "keep" dropped (both mean Như máy), numbers as strings.
 * Two values with the same canonical form mean the same settings.
 */
export function canonical(value: unknown): string {
  const out = normalize(value);
  return out === undefined ? "" : JSON.stringify(out);
}

function normalize(value: unknown): unknown {
  if (value === undefined || value === "keep") return undefined;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = normalize((value as Record<string, unknown>)[key]);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

/** One flag per stage: true when any field of that stage differs from the source slot. */
export function changedStages(source: SlotDraft, edited: SlotDraft): boolean[] {
  return STAGE_FIELDS.map((fields) => fields.some((f) => canonical(source[f]) !== canonical(edited[f])));
}

export type EditError = {
  /** null when the message is about the set as a whole (name, id, default flag). */
  slot: SlotNumber | null;
  /** Field path inside the slot, e.g. "wb.kelvin" or "pp.black_level". Empty when there is no field. */
  path: string;
  /** Stage index for the field, or null when the field is not on a stage. */
  stage: number | null;
  message: string;
};

export type EditResult = { set: PresetSet } | { error: EditError };

// Shape of validatePresetSets messages: "Bộ N.name: msg", "Bộ N.M2: msg", "Bộ N.M2.wb.kelvin: msg".
const MESSAGE = /^Bộ \d+(?:\.M([1-4]))?(?:\.([^:]*))?: ([\s\S]*)$/;
// Raised by applySettings when ppOn is false and pp is set (dat.ts).
const PP_OFF = "Tắt Picture Profile thì không chỉnh thông số PP.";
const SYSTEMS: readonly System[] = ["pal", "ntsc"];

function fromValidation(message: string): EditError {
  const m = MESSAGE.exec(message);
  if (!m) return { slot: null, path: "", stage: null, message };
  const path = m[2] ?? "";
  return {
    slot: m[1] ? (Number(m[1]) as SlotNumber) : null,
    path,
    stage: stageOfField(path.split(".")[0]),
    message: m[3],
  };
}

/**
 * Checks a set the way a write would. Field rules come from validatePresetSets. The codec check runs applySettings
 * for each slot on the PAL and NTSC bases, so codec-only rules (such as PP off with PP values) are caught here.
 * Returns the normalized set on success.
 */
export function validateEdited(set: PresetSet): EditResult {
  let checked: PresetSet;
  try {
    [checked] = validatePresetSets([set]);
  } catch (e) {
    if (e instanceof PresetError) return { error: fromValidation(e.message) };
    throw e;
  }
  for (const system of SYSTEMS) {
    const base = loadBase(system);
    for (const [i, slot] of checked.slots.entries()) {
      const slotNo = (i + 1) as SlotNumber;
      try {
        applySettings(base, slotNo, slot.settings);
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        const ppOff = e.message === PP_OFF;
        return {
          error: {
            slot: slotNo,
            path: ppOff ? "ppOn" : "",
            stage: ppOff ? stageOfField("ppOn") : null,
            message: e.message,
          },
        };
      }
    }
  }
  return { set: checked };
}
