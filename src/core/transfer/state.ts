// Write state kept by the app: family per card, what it last wrote, and a write still in progress.
// Cards are keyed by SAF volume uuid. Pure TS: the storage layer reads and writes the JSON text.
import { existingFamily, slotFileName, type CardState, type Family, type PlannedFile } from "./plan.ts";
import { sha256Hex } from "./sha256.ts";

export class StateError extends Error {}

export type WriteRecord = {
  setId: string;
  family: Family;
  /** ISO time of the write. */
  date: string;
  /** The four files the app wrote, in slot order, with sha256 hex of the bytes written. */
  files: { name: string; sha256: string }[];
};

/** A write that started and was not confirmed finished. The backup is restored on the next read of the card. */
export type PendingWrite = { backupId: string; setId: string; startedAt: string };

export type WriteState = {
  families: Record<string, Family>;
  lastWritten: Record<string, WriteRecord>;
  pending: Record<string, PendingWrite>;
};


const HEX64 = /^[0-9a-f]{64}$/;

/** Record of a finished write: the planned files as the app wrote them. */
export function recordFor(setId: string, planned: PlannedFile[], family: Family, date: string): WriteRecord {
  if (planned.length !== 4) throw new StateError(`Cần đúng 4 file để ghi nhận, nhận ${planned.length}`);
  return {
    setId,
    family,
    date,
    files: planned.map((f, i) => {
      const name = f.relPath.split("/").pop() ?? "";
      if (name !== slotFileName(i + 1, family)) throw new StateError(`File thứ ${i + 1} không đúng tên: ${name}`);
      return { name, sha256: sha256Hex(f.bytes) };
    }),
  };
}

/**
 * Slots (1–4) whose card file no longer matches what the app wrote. A missing file counts as changed.
 * Empty when the card has no CAMPR files, or when its family is not the record's family (the record says nothing about it).
 */
export function overwrittenSlots(card: CardState, record: WriteRecord): number[] {
  if (existingFamily(card) !== record.family) return [];
  const changed: number[] = [];
  record.files.forEach((entry, i) => {
    const file = card.settingFiles.find((f) => f.name === entry.name);
    if (!file || sha256Hex(file.bytes) !== entry.sha256) changed.push(i + 1);
  });
  return changed;
}

/** The card still holds the record: same family, no planned slot changed. Mixed families do not hold it. */
export function recordHolds(card: CardState, record: WriteRecord): boolean {
  try {
    return existingFamily(card) === record.family && overwrittenSlots(card, record).length === 0;
  } catch {
    return false;
  }
}

/** The most recent write across all cards, by its ISO date. A date that does not parse sorts oldest. Null when no card has a record. */
export function latestWriteRecord(lastWritten: Record<string, WriteRecord>): WriteRecord | null {
  let best: WriteRecord | null = null;
  let bestTime = -Infinity;
  for (const record of Object.values(lastWritten)) {
    const parsed = Date.parse(record.date);
    const time = Number.isNaN(parsed) ? -Infinity : parsed;
    if (best === null || time > bestTime) {
      best = record;
      bestTime = time;
    }
  }
  return best;
}

/**
 * Family for the next write. The card's own files win, then the family remembered for this card.
 * ask is true only when neither is known; the UI then asks once, with PAL as the default.
 */
export function chooseFamily(existing: Family | null, remembered: Family | undefined): { family: Family; ask: boolean } {
  if (existing) return { family: existing, ask: false };
  if (remembered) return { family: remembered, ask: false };
  return { family: "P", ask: true };
}

const pad = (n: number, width: number): string => String(n).padStart(width, "0");

/** Backup id for one write, in local time: yyyyMMdd-HHmmss-SSS. The native layer accepts only this shape. */
export function newBackupId(date: Date): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
  const time = `${pad(date.getHours(), 2)}${pad(date.getMinutes(), 2)}${pad(date.getSeconds(), 2)}`;
  return `${day}-${time}-${pad(date.getMilliseconds(), 3)}`;
}

// ---- JSON (version 1). Anything that does not match throws StateError; nothing is silently reset.

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isFamily = (v: unknown): v is Family => v === "P" || v === "N";
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;

function parseRecord(v: unknown, where: string): WriteRecord {
  if (!isObject(v) || !nonEmpty(v.setId) || !isFamily(v.family) || !nonEmpty(v.date) || !Array.isArray(v.files)) {
    throw new StateError(`${where}: bản ghi ghi thẻ không hợp lệ`);
  }
  const family = v.family;
  if (v.files.length !== 4) throw new StateError(`${where}: cần đúng 4 file`);
  const files = v.files.map((f, i) => {
    if (!isObject(f) || f.name !== slotFileName(i + 1, family) || typeof f.sha256 !== "string" || !HEX64.test(f.sha256)) {
      throw new StateError(`${where}: file ${i + 1} không hợp lệ`);
    }
    return { name: f.name, sha256: f.sha256 };
  });
  return { setId: v.setId, family, date: v.date, files };
}

function parseMap<T>(v: unknown, where: string, item: (x: unknown, key: string) => T): Record<string, T> {
  if (v === undefined) return {};
  if (!isObject(v)) throw new StateError(`${where}: phải là object`);
  const out: Record<string, T> = {};
  for (const [k, x] of Object.entries(v)) out[k] = item(x, k);
  return out;
}

/** Parse the state file text. null (no file yet) gives the empty state. Corrupt text throws StateError. */
export function parseWriteState(text: string | null): WriteState {
  if (text === null) return { families: {}, lastWritten: {}, pending: {} };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new StateError("File trạng thái ghi thẻ bị hỏng (không phải JSON)");
  }
  if (!isObject(json) || json.version !== 1) throw new StateError("File trạng thái ghi thẻ: sai phiên bản");
  return {
    families: parseMap(json.families, "families", (x, k) => {
      if (!isFamily(x)) throw new StateError(`families.${k}: phải là P hoặc N`);
      return x;
    }),
    lastWritten: parseMap(json.lastWritten, "lastWritten", (x, k) => parseRecord(x, `lastWritten.${k}`)),
    pending: parseMap(json.pending, "pending", (x, k) => {
      if (!isObject(x) || !nonEmpty(x.backupId) || !nonEmpty(x.setId) || !nonEmpty(x.startedAt)) {
        throw new StateError(`pending.${k}: không hợp lệ`);
      }
      return { backupId: x.backupId, setId: x.setId, startedAt: x.startedAt };
    }),
  };
}

export function serializeWriteState(state: WriteState): string {
  return JSON.stringify({ version: 1, families: state.families, lastWritten: state.lastWritten, pending: state.pending }, null, 2);
}
