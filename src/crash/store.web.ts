// Crash entries on the web: localStorage, one key per entry, under the same file name the native folder uses.
// Sync calls only, as on native: the handlers that call writeCrashEntry must not wait.
import {
  crashFileName,
  crashFilesToDelete,
  formatCrashEntry,
  isCrashFileName,
  parseCrashEntry,
  type CrashEntry,
} from "@/crash/entry";

export type StoredCrash = { name: string; entry: CrashEntry };

const PREFIX = "crash/";

/** Every crash file name in storage, oldest first. */
function crashNames(): string[] {
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX) && isCrashFileName(key.slice(PREFIX.length))) names.push(key.slice(PREFIX.length));
  }
  return names.sort();
}

/** Saves one entry, then keeps the newest MAX_CRASH_ENTRIES. Never throws: it runs inside crash handlers. */
export function writeCrashEntry(entry: CrashEntry): void {
  try {
    localStorage.setItem(PREFIX + crashFileName(entry.time, entry.source), formatCrashEntry(entry));
    for (const name of crashFilesToDelete(crashNames())) {
      localStorage.removeItem(PREFIX + name);
    }
  } catch {
    // Logging must not hide the crash.
  }
}

/** Every stored entry, newest first. A value that does not parse is skipped. */
export function listCrashEntries(): StoredCrash[] {
  try {
    return crashNames()
      .reverse()
      .flatMap((name) => {
        const entry = parseCrashEntry(localStorage.getItem(PREFIX + name) ?? "");
        return entry ? [{ name, entry }] : [];
      });
  } catch {
    return [];
  }
}

/** Deletes one stored entry by its file name. */
export function deleteCrash(name: string): void {
  if (!isCrashFileName(name)) return;
  localStorage.removeItem(PREFIX + name);
}

/** Deletes every crash entry, including ones that do not parse. */
export function clearCrashes(): void {
  for (const name of crashNames()) {
    localStorage.removeItem(PREFIX + name);
  }
}
