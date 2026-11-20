// Web side of the UsbVolume module. On Chromium desktop the card is a folder the user picks with the File System Access
// API (the card's root, the folder that holds PRIVATE/): read and write. Other browsers read the CAMPR files the user
// picked (read only) and never write the card here: they hand the files out (see src/write/WebWritePanel.tsx).
// The card logic mirrors android/.../CardCore.kt: keep the two in step.
import { CAMPR, canPickCardFolder, pickedCardFiles, setPickedCardFiles, chooseCardFiles, type PickedFile } from "@/card/webAccess";
import { base64ToBytes, bytesToBase64 } from "@/core/web/lib/app-core/bases";
import type {
  BackupFiles,
  BackupInfo,
  CardFileBase64,
  CardInspection,
  FileResult,
  RestoreReport,
  TreeInfo,
  UsbDevice,
  VolumeChange,
  VolumeInfo,
  WriteInput,
  WriteProgress,
  WriteReport,
  WriteStatus,
} from "./index";

export type {
  BackupFiles,
  BackupInfo,
  CardFileBase64,
  CardInspection,
  FileResult,
  RestoreReport,
  TreeInfo,
  UsbDevice,
  UsbMode,
  VolumeChange,
  VolumeInfo,
  WriteInput,
  WriteProgress,
  WriteReport,
  WriteStatus,
} from "./index";

/** Same error codes as the Android side, so the JS callers read both alike. */
class CardError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CardError";
  }
}

const SONYCARD = "PRIVATE/SONY/SONYCARD.IND";
const MEDIAPRO = "PRIVATE/M4ROOT/MEDIAPRO.XML";
const SETTING_ROOT = "PRIVATE/SONY/SETTING";
const E10_DIR = "PRIVATE/SONY/SETTING/E10";
const FOLDER_NAME = /^[A-Z0-9]{1,16}$/;
const HEADER_MODEL_END = 0x14;
const BACKUP_ID = /^\d{8}-\d{6}-\d{3}$/;
const SYSTEM_KIND = /systemkind\W{1,4}([A-Za-z0-9_.-]+)/i;
const READ_WRITE = { mode: "readwrite" } as const;
const CARD_KEY = "card";
/** The uuid of the picked files. They carry no card id, so the write records match them by file content only. */
const PICKED_UUID = "picked-files";

type StoredCard = { uuid: string; handle: FileSystemDirectoryHandle };
type BackupRecord = {
  id: string;
  createdAt: number;
  entries: { name: string; existed: boolean }[];
  files: Record<string, Uint8Array>;
};
type Permissioned = {
  queryPermission(d: typeof READ_WRITE): Promise<PermissionState>;
  requestPermission(d: typeof READ_WRITE): Promise<PermissionState>;
};
type PickerWindow = { showDirectoryPicker(options: typeof READ_WRITE): Promise<FileSystemDirectoryHandle> };

const progressListeners = new Set<(p: WriteProgress) => void>();

// IndexedDB: the card folder handle (one record) and the backups, keyed by backup id.
const DB_NAME = "alphacolorlab-console";
const HANDLES = "handles";
const BACKUPS = "backups";
let dbPromise: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(HANDLES);
      open.result.createObjectStore(BACKUPS);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return dbPromise;
}

function store<T>(name: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return database().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(name, mode).objectStore(name));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

let cardMemo: Promise<StoredCard | null> | null = null;

/** The card folder the user chose before, or null. Memoized so a tap can use it without waiting on IndexedDB. */
function savedCard(): Promise<StoredCard | null> {
  cardMemo ??= store<StoredCard | undefined>(HANDLES, "readonly", (s) => s.get(CARD_KEY)).then((c) => c ?? null);
  return cardMemo;
}

function saveCard(card: StoredCard): Promise<void> {
  cardMemo = Promise.resolve(card);
  return store(HANDLES, "readwrite", (s) => s.put(card, CARD_KEY)).then(() => undefined);
}

function perms(handle: FileSystemDirectoryHandle): Permissioned {
  return handle as unknown as Permissioned;
}

async function hasWriteAccess(handle: FileSystemDirectoryHandle): Promise<boolean> {
  return (await perms(handle).queryPermission(READ_WRITE)) === "granted";
}

function requireSupport(): void {
  if (!canPickCardFolder()) throw new CardError("E_UNSUPPORTED", "This browser cannot open the card folder");
}

function isNamed(e: unknown, ...names: string[]): boolean {
  return typeof e === "object" && e !== null && names.includes(String((e as { name?: unknown }).name));
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** The saved card, once the browser still grants it and its volume answers. Throws E_NO_TREE otherwise. */
async function requireCard(): Promise<StoredCard> {
  const card = await savedCard();
  if (!card || !(await hasWriteAccess(card.handle))) throw new CardError("E_NO_TREE", "No camera card found");
  try {
    await card.handle.values().next();
  } catch {
    throw new CardError("E_NO_TREE", "Camera card is not reachable");
  }
  return card;
}

async function pickFolder(): Promise<StoredCard> {
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await (window as unknown as PickerWindow).showDirectoryPicker(READ_WRITE);
  } catch (e) {
    if (isNamed(e, "AbortError")) throw new CardError("E_PICK_CANCELLED", "No folder chosen");
    throw e;
  }
  // Picking the same folder again keeps its uuid, so the app's write records still match the card.
  const previous = await savedCard();
  const same = previous ? await previous.handle.isSameEntry(handle).catch(() => false) : false;
  const card = { uuid: same && previous ? previous.uuid : crypto.randomUUID(), handle };
  await saveCard(card);
  return card;
}

// ---- Card access ----------------------------------------------------------------------------------------------

export async function listVolumes(): Promise<VolumeInfo[]> {
  return [];
}

/** True when the card is granted: the saved folder still granted, or (without the folder picker) files picked. */
export async function hasAllFilesAccess(): Promise<boolean> {
  if (!canPickCardFolder()) return pickedCardFiles() !== null;
  const card = await savedCard();
  return card !== null && (await hasWriteAccess(card.handle));
}

/**
 * Grants the card: the folder picker when none is saved, else the permission prompt. Without the folder picker, the
 * file chooser for the CAMPR files. Call it from a tap: the first await must come after the browser dialog opens.
 */
export async function openAllFilesAccessSettings(): Promise<void> {
  if (!canPickCardFolder()) {
    const files = await chooseCardFiles();
    if (files === null) throw new CardError("E_PICK_CANCELLED", "No file chosen");
    if (files.length === 0) throw new CardError("E_NO_CAMPR", "No CAMPR file chosen");
    setPickedCardFiles(files);
    return;
  }
  const card = await savedCard();
  if (card && (await perms(card.handle).requestPermission(READ_WRITE)) === "granted") return;
  await pickFolder();
}

/** Opens the folder picker. The browser only allows it from a user gesture. */
export async function pickCardTree(): Promise<TreeInfo> {
  requireSupport();
  const card = await pickFolder();
  return { uri: card.handle.name, uuid: card.uuid };
}

export async function isTreeAvailable(): Promise<boolean> {
  try {
    await requireCard();
    return true;
  } catch {
    return false;
  }
}

/** The web has no USB events and no USB device list, so the card is found by reading the folder. */
export async function getUsbState(): Promise<UsbDevice | null> {
  return null;
}

// ---- Card files -----------------------------------------------------------------------------------------------

function splitPath(rel: string): { dir: string; name: string } {
  const i = rel.lastIndexOf("/");
  return { dir: i < 0 ? "" : rel.slice(0, i), name: rel.slice(i + 1) };
}

function cardPath(name: string): string {
  return `${E10_DIR}/${name}`;
}

/** The folder at a slash path under the card root. Null when a part is missing or is a file. */
async function folderAt(root: FileSystemDirectoryHandle, rel: string, create = false): Promise<FileSystemDirectoryHandle | null> {
  let cur = root;
  for (const seg of rel.split("/").filter((s) => s !== "")) {
    try {
      cur = await cur.getDirectoryHandle(seg, { create });
    } catch (e) {
      if (isNamed(e, "NotFoundError", "TypeMismatchError")) return null;
      throw e;
    }
  }
  return cur;
}

/** Bytes of the file, or null when there is no such file. */
async function readFile(root: FileSystemDirectoryHandle, rel: string): Promise<Uint8Array | null> {
  const { dir, name } = splitPath(rel);
  const parent = await folderAt(root, dir);
  if (!parent) return null;
  try {
    const file = await (await parent.getFileHandle(name)).getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch (e) {
    if (isNamed(e, "NotFoundError", "TypeMismatchError")) return null;
    throw e;
  }
}

async function fileExists(root: FileSystemDirectoryHandle, rel: string): Promise<boolean> {
  const { dir, name } = splitPath(rel);
  const parent = await folderAt(root, dir);
  if (!parent) return false;
  try {
    await parent.getFileHandle(name);
    return true;
  } catch (e) {
    if (isNamed(e, "NotFoundError", "TypeMismatchError")) return false;
    throw e;
  }
}

async function listNames(root: FileSystemDirectoryHandle, dirRel: string): Promise<string[]> {
  const folder = await folderAt(root, dirRel);
  if (!folder) return [];
  const names: string[] = [];
  for await (const name of folder.keys()) names.push(name);
  return names;
}

async function camprNames(root: FileSystemDirectoryHandle, dirRel: string): Promise<string[]> {
  return (await listNames(root, dirRel)).filter((n) => CAMPR.test(n)).sort();
}

/** Writes the file, replacing it. Throws on failure. The caller reads it back. */
async function writeFile(root: FileSystemDirectoryHandle, rel: string, bytes: Uint8Array): Promise<void> {
  const { dir, name } = splitPath(rel);
  const parent = await folderAt(root, dir);
  if (!parent) throw new Error(`cannot open folder for ${name}`);
  const writable = await (await parent.getFileHandle(name, { create: true })).createWritable();
  try {
    // A copy, so the chunk is typed over a plain ArrayBuffer (the DOM typings reject ArrayBufferLike).
    await writable.write(new Uint8Array(bytes));
    await writable.close();
  } catch (e) {
    await writable.abort().catch(() => undefined);
    throw e;
  }
}

/** Removes the file. True when it is gone afterwards. */
async function deleteFile(root: FileSystemDirectoryHandle, rel: string): Promise<boolean> {
  const { dir, name } = splitPath(rel);
  const parent = await folderAt(root, dir);
  if (!parent) return true;
  try {
    await parent.removeEntry(name);
    return true;
  } catch (e) {
    return isNamed(e, "NotFoundError");
  }
}

/** Model string in a settings file header: the bytes from 5 up to the first NUL, within the first 0x14 bytes. */
function headerModel(bytes: Uint8Array): string {
  const limit = Math.min(bytes.length, HEADER_MODEL_END);
  let end = 5;
  while (end < limit && bytes[end] !== 0) end++;
  return String.fromCharCode(...bytes.subarray(5, end));
}

async function findSettingFolder(root: FileSystemDirectoryHandle, sonyModel: string): Promise<string | null> {
  for (const folder of (await listNames(root, SETTING_ROOT)).sort()) {
    const dir = `${SETTING_ROOT}/${folder}`;
    if (!FOLDER_NAME.test(folder) || !(await folderAt(root, dir))) continue;
    for (const name of await camprNames(root, dir)) {
      const bytes = await readFile(root, `${dir}/${name}`).catch(() => null);
      if (bytes && headerModel(bytes) === sonyModel) return folder;
    }
  }
  return null;
}

/**
 * The picked CAMPR files as an inspection. A CAMPR file only exists on a Sony card, so the Sony marker is taken as
 * present. The card's model and setting folder are not visible from the files alone, so no folder check is made.
 */
function inspectPicked(files: PickedFile[]): CardInspection {
  const families = [...new Set(files.map((f) => CAMPR.exec(f.name)?.[2]).filter((f): f is string => f !== undefined))];
  return {
    sonyCard: true,
    uuid: PICKED_UUID,
    systemKind: null,
    family: families.length === 1 ? (families[0] as "P" | "N") : null,
    settingDir: files.length > 0,
    files: files.map((f) => ({ name: f.name, size: f.bytes.length, base64: bytesToBase64(f.bytes) })),
  };
}

/** Reads the Sony markers and the M1–M4 settings files of the card. Mirrors inspectCard in CardCore.kt. */
export async function inspectCard(settingFolder: string | null, sonyModel: string | null): Promise<CardInspection> {
  const picked = pickedCardFiles();
  if (!canPickCardFolder() && picked !== null) return inspectPicked(picked);
  const card = await requireCard();
  if (settingFolder !== null && !FOLDER_NAME.test(settingFolder)) {
    throw new CardError("E_BAD_PATH", `Bad setting folder ${settingFolder}`);
  }
  const root = card.handle;
  const sonyCard = await fileExists(root, SONYCARD);
  const mediapro = await readFile(root, MEDIAPRO);
  const systemKind = mediapro ? (SYSTEM_KIND.exec(new TextDecoder("utf-8").decode(mediapro))?.[1] ?? null) : null;
  const name = settingFolder ?? (sonyModel !== null ? await findSettingFolder(root, sonyModel) : null);
  const dir = name === null ? null : `${SETTING_ROOT}/${name}`;
  const names = dir === null ? [] : await camprNames(root, dir);
  const files: CardFileBase64[] = [];
  for (const n of names) {
    const bytes = await readFile(root, `${dir}/${n}`);
    if (!bytes) throw new CardError("E_CARD_IO", `Cannot read ${n}`);
    files.push({ name: n, size: bytes.length, base64: bytesToBase64(bytes) });
  }
  const families = [...new Set(names.map((n) => CAMPR.exec(n)?.[2]).filter((f): f is string => f !== undefined))];
  return {
    sonyCard,
    uuid: card.uuid,
    systemKind,
    family: families.length === 1 ? (families[0] as "P" | "N") : null,
    settingDir: dir !== null && (await folderAt(root, dir)) !== null,
    files,
  };
}

// ---- Writes and backups ---------------------------------------------------------------------------------------

function emit(relPath: string, status: WriteStatus): void {
  for (const fn of progressListeners) fn({ relPath, status });
}

/** Only CAMPR files directly in the setting folder may be written. Returns the file name. */
function nameOf(relPath: string): string {
  const name = relPath.startsWith(`${E10_DIR}/`) ? relPath.slice(E10_DIR.length + 1) : relPath;
  if (relPath !== cardPath(name) || !CAMPR.test(name)) throw new CardError("E_BAD_PATH", `Refusing to write ${relPath}`);
  return name;
}

async function requireSonyCard(root: FileSystemDirectoryHandle): Promise<void> {
  if (!(await fileExists(root, SONYCARD))) {
    throw new CardError("E_NOT_SONY_CARD", "Card has no Sony markers; format it in the camera");
  }
}

async function ensureSettingDir(root: FileSystemDirectoryHandle): Promise<void> {
  const ok = await folderAt(root, E10_DIR, true).then((d) => d !== null, () => false);
  if (!ok) throw new CardError("E_CARD_IO", `Cannot create ${E10_DIR}`);
}

/** Writes [bytes] as [name] in the setting folder and throws unless the read-back matches. */
async function putVerified(root: FileSystemDirectoryHandle, name: string, bytes: Uint8Array): Promise<void> {
  const rel = cardPath(name);
  await writeFile(root, rel, bytes);
  const back = await readFile(root, rel);
  if (!back || !sameBytes(back, bytes)) {
    throw new Error(`read-back mismatch for ${name} (wrote ${bytes.length}, read ${back?.length ?? "nothing"})`);
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

async function loadBackup(id: string): Promise<BackupRecord> {
  const record = BACKUP_ID.test(id)
    ? await store<BackupRecord | undefined>(BACKUPS, "readonly", (s) => s.get(id))
    : undefined;
  if (!record) throw new CardError("E_NO_BACKUP", `Backup ${id} not found`);
  return record;
}

function backupFile(backup: BackupRecord, name: string): Uint8Array {
  const bytes = backup.files[name];
  if (!bytes) throw new CardError("E_NO_BACKUP", "Backup has a bad entry");
  return bytes;
}

/**
 * Backs up the card, writes each file, reads it back, and restores the backup if anything fails. Mirrors
 * CardWriter.writeVerified in CardCore.kt.
 */
export async function writeFilesVerified(files: WriteInput[], backupId: string): Promise<WriteReport> {
  const root = (await requireCard()).handle;
  await requireSonyCard(root);
  const targets = files.map((f) => ({ name: nameOf(f.relPath), relPath: f.relPath, bytes: base64ToBytes(f.base64) }));
  await ensureSettingDir(root);

  const originals = new Map<string, Uint8Array | null>();
  for (const t of targets) {
    originals.set(
      t.name,
      await readFile(root, cardPath(t.name)).catch(() => {
        throw new CardError("E_CARD_IO", `Cannot back up ${t.name}`);
      }),
    );
  }
  const record: BackupRecord = {
    id: backupId,
    createdAt: Date.now(),
    entries: [...originals].map(([name, bytes]) => ({ name, existed: bytes !== null })),
    files: Object.fromEntries([...originals].flatMap(([name, bytes]) => (bytes ? [[name, bytes]] : []))),
  };
  await store(BACKUPS, "readwrite", (s) => s.put(record, backupId));

  const results: FileResult[] = [];
  const attempted: string[] = [];
  let failed = false;
  for (const t of targets) {
    if (failed) {
      results.push({ relPath: t.relPath, ok: false, error: "not attempted" });
      emit(t.relPath, "skipped");
      continue;
    }
    attempted.push(t.name);
    emit(t.relPath, "writing");
    const error = await putVerified(root, t.name, t.bytes).then(
      () => null,
      (e: unknown) => messageOf(e),
    );
    failed = error !== null;
    results.push({ relPath: t.relPath, ok: error === null, error });
    emit(t.relPath, error === null ? "ok" : "error");
  }

  let rolledBack = false;
  if (failed) {
    emit("", "restoring");
    rolledBack = await restoreOriginals(root, [...attempted].reverse(), originals).then(
      () => true,
      () => false,
    );
    emit("", rolledBack ? "restored" : "restore-failed");
  }
  return { backupId, ok: !failed, rolledBack, results };
}

/** Puts back the files the write touched. A file that did not exist before is removed. */
async function restoreOriginals(
  root: FileSystemDirectoryHandle,
  names: string[],
  originals: Map<string, Uint8Array | null>,
): Promise<void> {
  for (const name of names) {
    const original = originals.get(name);
    if (original) await putVerified(root, name, original);
    else if (!(await deleteFile(root, cardPath(name)))) throw new Error(`cannot delete ${name}`);
  }
}

export async function restoreBackup(id: string): Promise<RestoreReport> {
  const root = (await requireCard()).handle;
  await requireSonyCard(root);
  const backup = await loadBackup(id);
  await ensureSettingDir(root);
  const results: FileResult[] = [];
  for (const e of backup.entries) {
    const rel = cardPath(e.name);
    const error = await (e.existed
      ? putVerified(root, e.name, backupFile(backup, e.name))
      : deleteFile(root, rel).then((gone) => {
          if (!gone) throw new Error(`cannot delete ${e.name}`);
        })
    ).then(
      () => null,
      (err: unknown) => messageOf(err),
    );
    results.push({ relPath: rel, ok: error === null, error });
  }
  return { backupId: id, ok: results.every((r) => r.ok), results };
}

export async function listBackups(): Promise<BackupInfo[]> {
  const records = await store<BackupRecord[]>(BACKUPS, "readonly", (s) => s.getAll());
  return records
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .map((r) => ({ id: r.id, createdAt: r.createdAt, files: r.entries.length }));
}

export async function readBackup(id: string): Promise<BackupFiles> {
  const backup = await loadBackup(id);
  const files = backup.entries
    .filter((e) => e.existed)
    .map((e): CardFileBase64 => {
      const bytes = backupFile(backup, e.name);
      return { name: e.name, size: bytes.length, base64: bytesToBase64(bytes) };
    });
  return { id, files };
}

// ---- Events ---------------------------------------------------------------------------------------------------

/** No USB events on the web. Returns a remover that does nothing. */
export function subscribeUsb(
  onAttached: (d: UsbDevice) => void,
  onDetached: (d: UsbDevice) => void,
): () => void {
  void onAttached;
  void onDetached;
  return () => undefined;
}

/** No volume events on the web. Returns a remover that does nothing. */
export function subscribeVolumes(onChanged: (c: VolumeChange) => void): () => void {
  void onChanged;
  return () => undefined;
}

/** Calls back once per file (and once for a restore) while writeFilesVerified runs. Returns a remover. */
export function subscribeWriteProgress(onProgress: (p: WriteProgress) => void): () => void {
  progressListeners.add(onProgress);
  return () => {
    progressListeners.delete(onProgress);
  };
}
