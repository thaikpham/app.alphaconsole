// User preset sets: one JSON file holds the sets the user copied or made. Bundled sets are read-only and never written.
// Every write re-validates bundled + user sets together (ids, default flag, 50-set limit, field rules), so a bad file is never saved.
// Pure TS, no expo imports. The app passes the file adapter in (src/storage/userSetsFile.ts).
import { PRESET_LIMITS, PresetError, validatePresetSets, type PresetSet } from "../web/lib/presetSets.ts";

export type UserSetRecord = { sourceId?: string; set: PresetSet };
export type UserSetsFile = { version: 1; sets: UserSetRecord[] };
/** null from read() means no file yet. */
export type SetsAdapter = { read(): Promise<string | null>; write(text: string): Promise<void> };

export class StoreError extends Error {}

const CORRUPT = "File bộ của tôi bị hỏng hoặc không đúng định dạng. Ứng dụng không ghi đè file này.";
const NOT_FOUND = "Không tìm thấy bộ này.";
const BUNDLED_READ_ONLY = "Bộ có sẵn không sửa hoặc xóa trực tiếp. Hãy sao chép trước.";
const COPY_SUFFIX = " (bản sao)";

export function parseUserSetsFile(text: string): UserSetsFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new StoreError(CORRUPT);
  }
  const top = raw as { version?: unknown; sets?: unknown } | null;
  if (!top || typeof top !== "object" || top.version !== 1 || !Array.isArray(top.sets)) throw new StoreError(CORRUPT);
  const sets = top.sets.map((item): UserSetRecord => {
    const rec = item as { sourceId?: unknown; set?: unknown } | null;
    if (!rec || typeof rec !== "object" || !rec.set || typeof rec.set !== "object") throw new StoreError(CORRUPT);
    if (rec.sourceId !== undefined && typeof rec.sourceId !== "string") throw new StoreError(CORRUPT);
    return { ...(typeof rec.sourceId === "string" ? { sourceId: rec.sourceId } : {}), set: rec.set as PresetSet };
  });
  return { version: 1, sets };
}

export function serializeUserSetsFile(file: UserSetsFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Lowercase ASCII slug of a Vietnamese name, at most PRESET_LIMITS.id characters. */
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRESET_LIMITS.id)
    .replace(/-+$/, "");
  return base || "bo";
}

/** A slug of name that is not in taken; a numeric suffix (-2, -3, …) is added when needed. */
export function uniqueSetId(name: string, taken: ReadonlySet<string>): string {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? "" : `-${n}`;
    const id = `${base.slice(0, PRESET_LIMITS.id - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!taken.has(id)) return id;
  }
}

export type SetStore = {
  /** Bundled sets (unlisted ones included, their ids are taken) and the user's sets. */
  load(): Promise<{ bundled: PresetSet[]; user: PresetSet[] }>;
  /** Copies a bundled or user set into a new user set. The copy has no default flag, no unlisted flag, and no author. */
  duplicate(id: string): Promise<PresetSet>;
  /** Replaces the user set with the same id. */
  save(set: PresetSet): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
};

/** Validates bundled + user together and returns the user records normalized (validatePresetSets trims them to the stored shape). */
function check(bundled: readonly PresetSet[], records: readonly UserSetRecord[]): UserSetRecord[] {
  let sets: PresetSet[];
  try {
    sets = validatePresetSets([...bundled, ...records.map((r) => r.set)]);
  } catch (e) {
    if (e instanceof PresetError) throw new StoreError(e.message);
    throw e;
  }
  return records.map((r, i) => ({ ...(r.sourceId !== undefined ? { sourceId: r.sourceId } : {}), set: sets[bundled.length + i] }));
}

export function createSetStore(adapter: SetsAdapter, bundled: readonly PresetSet[]): SetStore {
  // Every operation reads the file again, then writes; running them one at a time keeps concurrent taps from losing edits.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  async function readAll(): Promise<UserSetRecord[]> {
    const text = await adapter.read();
    return check(bundled, text === null ? [] : parseUserSetsFile(text).sets);
  }

  async function writeAll(records: UserSetRecord[]): Promise<UserSetRecord[]> {
    const checked = check(bundled, records);
    await adapter.write(serializeUserSetsFile({ version: 1, sets: checked }));
    return checked;
  }

  const missing = (id: string) => (bundled.some((s) => s.id === id) ? BUNDLED_READ_ONLY : NOT_FOUND);

  return {
    load: () =>
      serial(async () => {
        const records = await readAll();
        return { bundled: [...bundled], user: records.map((r) => r.set) };
      }),

    duplicate: (id) =>
      serial(async () => {
        const records = await readAll();
        const bundledSet = bundled.find((s) => s.id === id);
        const mine = records.find((r) => r.set.id === id);
        const source = bundledSet ?? mine?.set;
        if (!source) throw new StoreError(NOT_FOUND);
        const taken = new Set([...bundled.map((s) => s.id), ...records.map((r) => r.set.id)]);
        const copyName = `${source.name.slice(0, PRESET_LIMITS.name - COPY_SUFFIX.length).trimEnd()}${COPY_SUFFIX}`;
        const copy: PresetSet = {
          id: uniqueSetId(copyName, taken),
          name: copyName,
          description: source.description,
          slots: structuredClone(source.slots),
        };
        const sourceId = bundledSet ? bundledSet.id : mine?.sourceId;
        const written = await writeAll([...records, { ...(sourceId ? { sourceId } : {}), set: copy }]);
        return written[written.length - 1].set;
      }),

    save: (set) =>
      serial(async () => {
        const records = await readAll();
        const i = records.findIndex((r) => r.set.id === set.id);
        if (i < 0) throw new StoreError(missing(set.id));
        await writeAll(records.map((r, j) => (j === i ? { ...r, set } : r)));
      }),

    rename: (id, name) =>
      serial(async () => {
        const trimmed = name.trim();
        if (!trimmed) throw new StoreError("Tên bộ không được trống.");
        const records = await readAll();
        const i = records.findIndex((r) => r.set.id === id);
        if (i < 0) throw new StoreError(missing(id));
        await writeAll(records.map((r, j) => (j === i ? { ...r, set: { ...r.set, name: trimmed } } : r)));
      }),

    remove: (id) =>
      serial(async () => {
        const records = await readAll();
        if (!records.some((r) => r.set.id === id)) throw new StoreError(missing(id));
        await writeAll(records.filter((r) => r.set.id !== id));
      }),
  };
}
