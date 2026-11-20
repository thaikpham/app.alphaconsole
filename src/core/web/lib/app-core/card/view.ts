// Home view of a card: decode the M1–M4 files read only, and name the listed set slot each one matches.
// Pure TS. The native layer passes the inspected files in; nothing here writes.
import { importDat } from "../../datImport.ts";
import type { WB } from "../../zve10/dat.ts";
import type { PresetSet } from "../../presetSets.ts";
import { compare, existingFamily, TransferError, type CardState, type Family } from "../transfer/plan.ts";
import { base64ToBytes } from "../bases.ts";

export type InspectedCard = {
  sonyCard: boolean;
  settingDir: boolean;
  files: { name: string; base64: string }[];
};

export type SlotView = {
  slot: 1 | 2 | 3 | 4;
  /** False when the file is missing, or does not decode as a ZV-E10 photo DAT. */
  readable: boolean;
  mode: string | null;
  wb: string | null;
  ppOn: boolean | null;
  focus: string | null;
  /** Label of the listed set slot this file matches exactly (no field would change), else null. */
  label: string | null;
};

export type CardView = {
  family: Family | null;
  /** Empty when the card has no CAMPR files, or when its files mix PAL and NTSC. */
  slots: SlotView[];
  error: string | null;
};

export function toCardState(input: InspectedCard): CardState {
  return {
    sonyMarkers: input.sonyCard,
    settingFiles: input.files.map((f) => ({ name: f.name, bytes: base64ToBytes(f.base64) })),
  };
}

function wbText(wb: WB): string {
  return wb.mode === "ctemp" && wb.kelvin !== undefined ? `${wb.kelvin}K` : "AWB";
}

function labelFor(card: CardState, slot: 1 | 2 | 3 | 4, family: Family, sets: PresetSet[]): string | null {
  for (const set of sets) {
    if (!compare(card, set, family).includes(slot)) return set.slots[slot - 1].label;
  }
  return null;
}

export function describeCard(card: CardState, sets: PresetSet[]): CardView {
  let family: Family | null;
  try {
    family = existingFamily(card);
  } catch (e) {
    if (e instanceof TransferError) return { family: null, slots: [], error: e.message };
    throw e;
  }
  if (family === null) return { family, slots: [], error: null };

  const slots = ([1, 2, 3, 4] as const).map((slot): SlotView => {
    const file = card.settingFiles.find((f) => f.name === `CAMPR0${slot}${family}.DAT`);
    const label = file ? labelFor(card, slot, family, sets) : null;
    const result = file ? importDat(file.bytes, file.name) : null;
    if (!result || result.kind !== "zve10" || result.readOnly) {
      return { slot, readable: false, mode: null, wb: null, ppOn: null, focus: null, label };
    }
    const d = result.decoded;
    return {
      slot,
      readable: true,
      mode: d.mode,
      wb: wbText(d.wb),
      ppOn: d.pp_selected !== 0,
      focus: d.focus,
      label,
    };
  });
  return { family, slots, error: null };
}
