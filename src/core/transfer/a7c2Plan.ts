// Plan the A7C II's four CAMPR0{1-4}{P|N}.DAT files. Pure TS. Refused until EXPERIMENTAL_WRITE.a7c2 is turned on.
import { buildSetA7c2, type A7c2SlotSettings } from "../web/lib/a7c2/apply.ts";
import { A7C2, EXPERIMENTAL_WRITE } from "../models.ts";
import { TransferError, type Family, type PlannedFile } from "./plan.ts";

export const A7C2_SETTING_DIR = "PRIVATE/SONY/SETTING/7CM2/";

/** Four .DAT files built from the camera's own four bases. Throws TransferError while the write flag is off. */
export function planA7c2(bases: Uint8Array[], settings: A7c2SlotSettings[], family: Family = "P"): PlannedFile[] {
  if (!EXPERIMENTAL_WRITE.a7c2) throw new TransferError(`Chưa hỗ trợ ghi cho ${A7C2.name}`);
  return buildSetA7c2(bases, settings, family).map((f) => ({ relPath: A7C2_SETTING_DIR + f.name, bytes: f.data }));
}
