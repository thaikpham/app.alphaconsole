// Option lists for the set editor. Each list is a codec export (lib/zve10/dat.ts), or the fixed list that validatePresetSets accepts.
// Labels live in content.ts (labels). test/sets-options.test.ts checks that every value has a label and that the lists match the codec.
import {
  APERTURES,
  AUTO_REVIEW,
  AWB_PRIORITIES,
  E_FRONT_CURTAIN,
  EXP_COMP_SETS,
  FACE_PRIORITY,
  FLASH_MODES,
  FOCUS_AREAS,
  FOCUS_PROFILE,
  ISOS,
  LIVE_VIEW,
  METERING_MODES,
  PRE_AF,
  PROFILE,
  SHUTTERS,
  SOFT_SKIN,
  STEADY_SHOT,
} from "../web/lib/zve10/dat.ts";

export const MODE_OPTIONS: readonly string[] = Object.keys(PROFILE.shoot_modes);
export const FOCUS_OPTIONS: readonly string[] = FOCUS_PROFILE.modes;
/** WB modes accepted by validateSlot in presetSets.ts (hand-written; no codec export). */
export const WB_MODE_OPTIONS = ["awb", "ctemp"] as const;
export const APERTURE_OPTIONS: readonly string[] = APERTURES;
export const SHUTTER_OPTIONS: readonly string[] = SHUTTERS;
/** ISOS without the leading "AUTO" entry; Auto is its own choice in the editor. */
export const ISO_OPTIONS: readonly string[] = ISOS.filter((x) => x !== "AUTO");

/** Enum-valued fields. Keys are SlotSettings field names. "keep" is not listed: the editor offers it as Giữ nguyên. */
export const ENUM_OPTIONS = {
  mode: MODE_OPTIONS,
  focus: FOCUS_OPTIONS,
  wbMode: WB_MODE_OPTIONS,
  focusArea: FOCUS_AREAS,
  metering: METERING_MODES,
  facePriority: FACE_PRIORITY,
  softSkin: SOFT_SKIN,
  autoReview: AUTO_REVIEW,
  flashMode: FLASH_MODES,
  expCompSet: EXP_COMP_SETS,
  awbPriority: AWB_PRIORITIES,
  preAF: PRE_AF,
  steadyShot: STEADY_SHOT,
  eFrontCurtain: E_FRONT_CURTAIN,
  liveView: LIVE_VIEW,
} as const;

/** WB range checked by validateSlot in presetSets.ts (not a codec export). */
export const KELVIN_RANGE = { min: 2500, max: 9900, step: 100 } as const;
/** WB A-B and G-M range checked by validateSlot in presetSets.ts (not a codec export). */
export const AB_GM_RANGE = { min: -7, max: 7, step: 1 } as const;

/** Values from min to max by step, rounded to avoid float drift. */
export function rangeValues(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; min + i * step <= max + 1e-9; i++) out.push(Math.round((min + i * step) * 1000) / 1000);
  return out;
}

/** The value in list closest to target. */
export function nearest(values: readonly number[], target: number): number {
  return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best), values[0]);
}
