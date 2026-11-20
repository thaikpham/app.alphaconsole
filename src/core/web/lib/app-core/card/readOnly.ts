// Read-only rows for the A6400 and A7C II settings files on the card: one slot per M1–M4, decoded by the web codec.
// Pure TS. Nothing is written.
import type { CameraModel } from "../models.ts";
import { importDat } from "../../datImport.ts";

export type ReadOnlyRow = { settingId: string; valueLabel: string };
export type ReadOnlySlot = { slot: number; rows: ReadOnlyRow[] | null };

const CAMPR_NAME = /^CAMPR0([1-4])[NP]\.DAT$/;
const NO_VALUE = "—";

const label = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? NO_VALUE : String(value);

/** Rows of one file, or null when the file does not decode as this model's settings. */
function rowsOf(model: CameraModel, bytes: Uint8Array): ReadOnlyRow[] | null {
  const result = importDat(bytes);
  if (result.kind === "a6400" && model.id === "a6400") {
    return Object.entries(result.decoded.fields).map(([settingId, field]) => ({ settingId, valueLabel: label(field.value) }));
  }
  if (result.kind === "a7c2" && model.id === "a7c2") {
    return Object.entries(result.settings).map(([settingId, value]) => ({ settingId, valueLabel: label(value) }));
  }
  return null;
}

/** Slots 1–4 of a read-only model. A slot whose file is missing or does not decode has null rows. */
export function describeReadOnly(model: CameraModel, files: readonly { name: string; bytes: Uint8Array }[]): ReadOnlySlot[] {
  return [1, 2, 3, 4].map((slot) => {
    const file = files.find((f) => {
      const m = CAMPR_NAME.exec(f.name);
      return m !== null && Number(m[1]) === slot;
    });
    return { slot, rows: file ? rowsOf(model, file.bytes) : null };
  });
}
