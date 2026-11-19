// Typed JS side of the local UsbVolume Expo module. The Kotlin code lives in android/ and is the only native part.
import { requireNativeModule, type EventEmitter, type EventSubscription } from "expo";

export type VolumeInfo = { description: string; removable: boolean; primary: boolean; state: string };
export type TreeInfo = { uri: string; uuid: string };
export type UsbMode = "mass-storage" | "ptp" | "unknown";
export type UsbDevice = { vendorId: number; productId: number; mode: UsbMode };
export type CardFileBase64 = { name: string; size: number; base64: string };
export type CardInspection = {
  sonyCard: boolean;
  /** Volume UUID of the card that was read. */
  uuid: string;
  systemKind: string | null;
  family: "P" | "N" | null;
  settingDir: boolean;
  files: CardFileBase64[];
};
export type FileResult = { relPath: string; ok: boolean; error: string | null };
export type WriteReport = { backupId: string; ok: boolean; rolledBack: boolean; results: FileResult[] };
export type RestoreReport = { backupId: string; ok: boolean; results: FileResult[] };
export type BackupInfo = { id: string; createdAt: number; files: number };
export type BackupFiles = { id: string; files: CardFileBase64[] };
export type WriteInput = { relPath: string; base64: string };
export type WriteStatus = "writing" | "ok" | "error" | "skipped" | "restoring" | "restored" | "restore-failed";
export type WriteProgress = { relPath: string; status: WriteStatus };
/** [state] is the volume's mount state, as Android names it (e.g. "mounted", "unmounted"). */
export type VolumeChange = { state: string };

type UsbEvents = {
  usbAttached: (device: UsbDevice) => void;
  usbDetached: (device: UsbDevice) => void;
  writeProgress: (progress: WriteProgress) => void;
  volumesChanged: (change: VolumeChange) => void;
};

type Native = {
  listVolumes(): Promise<VolumeInfo[]>;
  hasAllFilesAccess(): Promise<boolean>;
  openAllFilesAccessSettings(): Promise<void>;
  pickCardTree(): Promise<TreeInfo>;
  isTreeAvailable(): Promise<boolean>;
  getUsbState(): Promise<UsbDevice | null>;
  inspectCard(settingFolder: string | null, sonyModel: string | null): Promise<CardInspection>;
  writeFilesVerified(files: WriteInput[], backupId: string): Promise<WriteReport>;
  listBackups(): Promise<BackupInfo[]>;
  readBackup(id: string): Promise<BackupFiles>;
  restoreBackup(id: string): Promise<RestoreReport>;
};

// expo-modules-core 58 types NativeModule<T> as a constructor type, so the instance type comes from EventEmitter.
const native = requireNativeModule<EventEmitter<UsbEvents> & Native>("UsbVolume");

export const listVolumes = () => native.listVolumes();
export const hasAllFilesAccess = () => native.hasAllFilesAccess();
export const openAllFilesAccessSettings = () => native.openAllFilesAccessSettings();
export const pickCardTree = () => native.pickCardTree();
export const isTreeAvailable = () => native.isTreeAvailable();
export const getUsbState = () => native.getUsbState();
/** [settingFolder] is the camera's folder under PRIVATE/SONY/SETTING. Null scans for the [sonyModel] header. */
export const inspectCard = (settingFolder: string | null, sonyModel: string | null) =>
  native.inspectCard(settingFolder, sonyModel);
/** [backupId] is chosen by the caller (yyyyMMdd-HHmmss-SSS) so it can be saved before the write starts. */
export const writeFilesVerified = (files: WriteInput[], backupId: string) => native.writeFilesVerified(files, backupId);
export const listBackups = () => native.listBackups();
export const readBackup = (id: string) => native.readBackup(id);
export const restoreBackup = (id: string) => native.restoreBackup(id);

/** Calls back on Sony USB attach or detach. Returns a function that removes both listeners. */
export function subscribeUsb(onAttached: (d: UsbDevice) => void, onDetached: (d: UsbDevice) => void): () => void {
  const subs: EventSubscription[] = [
    native.addListener("usbAttached", onAttached),
    native.addListener("usbDetached", onDetached),
  ];
  return () => subs.forEach((s) => s.remove());
}

/** Calls back when a removable volume is mounted, unmounted or removed (Android 11+). Returns a remover. */
export function subscribeVolumes(onChanged: (c: VolumeChange) => void): () => void {
  const sub: EventSubscription = native.addListener("volumesChanged", onChanged);
  return () => sub.remove();
}

/** Calls back once per file (and once for a restore) while writeFilesVerified runs. Returns a remover. */
export function subscribeWriteProgress(onProgress: (p: WriteProgress) => void): () => void {
  const sub: EventSubscription = native.addListener("writeProgress", onProgress);
  return () => sub.remove();
}
