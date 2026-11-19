// Plan the four CAMPR0{1-4}{P|N}.DAT files for a preset set, and compare a card against a set.
// Pure TS: no file or USB access. The native layer reads the card, passes it here, and writes what comes back.
import { applySettings, buildSet, parseDat, type BuiltSet } from "../web/lib/zve10/dat.ts";
import { validatePresetSets, type PresetSet, type SlotDraft } from "../web/lib/presetSets.ts";
import { loadBase, loadHeaders, type System } from "../bases.ts";
import type { CameraModel } from "../models.ts";

export const CARD_SETTING_DIR = "PRIVATE/SONY/SETTING/E10/";
export const SONY_MARKER = "PRIVATE/SONY/SONYCARD.IND";

export type Family = "P" | "N";
export type CardFile = { name: string; bytes: Uint8Array };
export type CardState = {
  /** True when PRIVATE/SONY/SONYCARD.IND exists on the card. */
  sonyMarkers: boolean;
  /** Files in PRIVATE/SONY/SETTING/E10/ (names only, e.g. CAMPR01P.DAT). Other names are ignored. */
  settingFiles: CardFile[];
};
export type PlannedFile = { relPath: string; bytes: Uint8Array };

export class TransferError extends Error {}

const CAMPR_NAME = /^CAMPR0([1-4])([NP])\.DAT$/;

export const slotFileName = (slot: number, family: Family): string => `CAMPR0${slot}${family}.DAT`;

const systemOf = (family: Family): System => (family === "P" ? "pal" : "ntsc");

function campr(card: CardState): { slot: number; family: Family; bytes: Uint8Array }[] {
  const out: { slot: number; family: Family; bytes: Uint8Array }[] = [];
  for (const f of card.settingFiles) {
    const m = CAMPR_NAME.exec(f.name);
    if (m) out.push({ slot: Number(m[1]), family: m[2] as Family, bytes: f.bytes });
  }
  return out;
}

/** Hệ của các file CAMPR có sẵn trên thẻ. Có cả P lẫn N thì báo lỗi, vì không biết hệ nào đúng. */
export function existingFamily(card: CardState): Family | null {
  const families = new Set(campr(card).map((c) => c.family));
  if (families.size > 1) throw new TransferError("Thẻ có cả file PAL (P) lẫn NTSC (N). Chỉ giữ một hệ rồi thử lại.");
  return families.size === 1 ? [...families][0] : null;
}

function existingBytes(card: CardState, slot: number, family: Family): Uint8Array | undefined {
  return campr(card).find((c) => c.slot === slot && c.family === family)?.bytes;
}

// parseDat (web/lib/zve10/dat.ts) rebuilds the trailer checksum for every trailer byte, about 25 ms a file. Every compare
// asks again for the same file, so the family is kept per file object. A read builds new file objects, so nothing goes stale.
const familyOfFile = new WeakMap<Uint8Array, Family | null>();

function familyOf(bytes: Uint8Array): Family | null {
  let family = familyOfFile.get(bytes);
  if (family === undefined) {
    try {
      family = parseDat(bytes).family;
    } catch {
      family = null;
    }
    familyOfFile.set(bytes, family);
  }
  return family;
}

// A card file is usable for comparison only if it parses as a ZV-E10 DAT of the same family.
function usableDat(bytes: Uint8Array | undefined, family: Family): bytes is Uint8Array {
  return bytes !== undefined && familyOf(bytes) === family;
}

function requireSony(card: CardState): void {
  if (!card.sonyMarkers) {
    throw new TransferError("Thẻ này không có cấu trúc máy Sony (PRIVATE/SONY). Hãy format thẻ trong máy ảnh rồi thử lại.");
  }
}

// A slot with PP values must say ppOn true or false. Without it, applySettings turns PP1 on without saying so.
const hasPp = (s: SlotDraft): boolean => typeof s.pp === "object" && s.pp !== null && Object.keys(s.pp).length > 0;

function requireExplicitPp(set: PresetSet): void {
  set.slots.forEach((slot, i) => {
    if (hasPp(slot.settings) && typeof slot.settings.ppOn !== "boolean") {
      throw new TransferError(`M${i + 1}: thiếu ppOn (bật/tắt PP) dù slot có thông số PP`);
    }
  });
}

/** Copy of the set with ppOn: true on each slot that has PP values and no explicit ppOn. The bundled hybrid sets are PP-on by name. */
export function explicitPp(set: PresetSet): PresetSet {
  return {
    ...set,
    slots: set.slots.map((slot) =>
      hasPp(slot.settings) && slot.settings.ppOn === undefined ? { ...slot, settings: { ...slot.settings, ppOn: true } } : slot,
    ) as PresetSet["slots"],
  };
}

function resolveFamily(card: CardState, family?: Family): Family {
  const existing = existingFamily(card);
  if (existing && family && existing !== family) {
    throw new TransferError(`Thẻ đang dùng hệ ${existing === "P" ? "PAL" : "NTSC"}, không khớp hệ đã chọn.`);
  }
  return existing ?? family ?? "P";
}

/**
 * Four .DAT files for a set, byte for byte what the web ZIP holds: bundled header 0x00–0x37 and bundled base body.
 * The card's own CAMPR header is never borrowed: on ZV-E10 (2026-11-18) a camera-saved header (0x24=03) spliced onto
 * a new body, and even the camera's own 03 file, gave "file error" on recall, while the bundled 02 header recalled fine.
 * The card is still read for its family (PAL/NTSC).
 * Throws TransferError when the card has no Sony markers, and PresetError/Error for invalid sets.
 */
export function planWrite(card: CardState, set: PresetSet, family?: Family): PlannedFile[] {
  requireSony(card);
  const [checked] = validatePresetSets([set]);
  requireExplicitPp(checked);
  const fam = resolveFamily(card, family);
  const headers = loadHeaders(systemOf(fam));
  const built: BuiltSet[] = buildSet(
    loadBase(systemOf(fam)),
    checked.slots.map((s) => s.settings),
    undefined,
    undefined,
    headers,
  );
  return built.map((f, i) => {
    if (f.name !== slotFileName(i + 1, fam)) throw new TransferError(`Tên file không khớp: ${f.name}`);
    return { relPath: CARD_SETTING_DIR + f.name, bytes: f.data };
  });
}

/** Throws TransferError when the model cannot be written. The write flow and planWriteFor both ask this. */
export function requireWritable(model: CameraModel): void {
  if (!model.capabilities.write) throw new TransferError(`Chưa hỗ trợ ghi cho ${model.name}`);
}

/** planWrite for a registry model. Refuses any model whose write capability is off. */
export function planWriteFor(model: CameraModel, card: CardState, set: PresetSet, family?: Family): PlannedFile[] {
  requireWritable(model);
  return planWrite(card, set, family);
}

// describeCard asks compare for every (slot, set) pair and matchingSet asks again for every set, so one read repeats the same
// work. A CardState is built once per read and not changed after, so its answers are kept for as long as it lives.
// A call that throws is not kept, so an invalid set keeps throwing.
const comparedOn = new WeakMap<CardState, Map<PresetSet, Map<Family | undefined, number[]>>>();

/**
 * Slots (1–4) whose file on the card would change if the set were written onto it.
 * A missing or unreadable slot file counts as differing. Fields the set leaves at "keep" are not compared.
 */
export function compare(card: CardState, set: PresetSet, family?: Family): number[] {
  let bySet = comparedOn.get(card);
  if (!bySet) comparedOn.set(card, (bySet = new Map()));
  let byFamily = bySet.get(set);
  if (!byFamily) bySet.set(set, (byFamily = new Map()));
  let differing = byFamily.get(family);
  if (!differing) {
    differing = compareFiles(card, set, family);
    byFamily.set(family, differing);
  }
  return [...differing];
}

function compareFiles(card: CardState, set: PresetSet, family?: Family): number[] {
  const [checked] = validatePresetSets([set]);
  const fam = resolveFamily(card, family);
  const differing: number[] = [];
  for (let slot = 1; slot <= 4; slot++) {
    const current = existingBytes(card, slot, fam);
    if (!usableDat(current, fam)) {
      differing.push(slot);
      continue;
    }
    const next = applySettings(current, slot as 1 | 2 | 3 | 4, checked.slots[slot - 1].settings);
    if (!bytesEqual(next, current)) differing.push(slot);
  }
  return differing;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
