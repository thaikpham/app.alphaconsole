// Crash files on disk: filesDir/crash/, one JSON file per entry. Native (CrashLog.kt) writes to the same folder.
// Sync calls only: a fatal error can end the process before an async write finishes.
import { Directory, File, Paths } from "expo-file-system";
import {
  crashFileName,
  crashFilesToDelete,
  formatCrashEntry,
  isCrashFileName,
  parseCrashEntry,
  type CrashEntry,
} from "@/crash/entry";

export type StoredCrash = { name: string; entry: CrashEntry };

function crashDir(): Directory {
  return new Directory(Paths.document, "crash");
}

/** Every crash file name in the folder, oldest first. */
function crashNames(dir: Directory): string[] {
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((item) => item instanceof File)
    .map((item) => item.name)
    .filter(isCrashFileName)
    .sort();
}

function readEntry(dir: Directory, name: string): CrashEntry | null {
  try {
    return parseCrashEntry(new File(dir, name).textSync());
  } catch {
    return null;
  }
}

/** Saves one entry, then keeps the newest MAX_CRASH_ENTRIES. Never throws: it runs inside crash handlers. */
export function writeCrashEntry(entry: CrashEntry): void {
  try {
    const dir = crashDir();
    dir.create({ idempotent: true, intermediates: true });
    const file = new File(dir, crashFileName(entry.time, entry.source));
    file.create({ overwrite: true, intermediates: true });
    file.writeSync(formatCrashEntry(entry));
    for (const name of crashFilesToDelete(crashNames(dir))) {
      new File(dir, name).delete();
    }
  } catch {
    // Logging must not hide the crash.
  }
}

/** Every stored entry, newest first. A file that does not parse is skipped. */
export function listCrashEntries(): StoredCrash[] {
  try {
    const dir = crashDir();
    return crashNames(dir)
      .reverse()
      .flatMap((name) => {
        const entry = readEntry(dir, name);
        return entry ? [{ name, entry }] : [];
      });
  } catch {
    return [];
  }
}

/** Deletes one stored entry by its file name. */
export function deleteCrash(name: string): void {
  if (!isCrashFileName(name)) return;
  try {
    new File(crashDir(), name).delete();
  } catch {
    // Already gone: the list is read from disk again after this.
  }
}

/** Deletes every crash file, including ones that do not parse. */
export function clearCrashes(): void {
  try {
    const dir = crashDir();
    for (const name of crashNames(dir)) {
      new File(dir, name).delete();
    }
  } catch {
    // Nothing to clear if the folder cannot be read.
  }
}
