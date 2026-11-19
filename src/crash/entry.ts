// One crash entry: its shape, the file name it is stored under, and the rule for keeping the newest ones.
// Native (modules/crash-log/.../CrashLog.kt) writes the same keys and file name to the same folder. Keep them in step.
// Pure: no expo or RN imports, so node:test can run it.

export const MAX_CRASH_ENTRIES = 20;

export const CRASH_SOURCES = ["js", "promise", "native"] as const;
export type CrashSource = (typeof CRASH_SOURCES)[number];

export type CrashEntry = {
  /** ISO 8601 UTC, e.g. 2026-11-18T10:20:30.123Z */
  time: string;
  appVersion: string;
  androidVersion: string;
  model: string;
  source: CrashSource;
  message: string;
  stack: string;
  /** The last ACL lines before the crash, oldest first. */
  acl: string[];
};

const FILE_NAME = /^\d{17}-[a-z]+\.json$/;

/** True for a name this store writes. Other files in the folder are left alone. */
export function isCrashFileName(name: string): boolean {
  return FILE_NAME.test(name);
}

/** The 17 digits of the time, then the source. Sorting by name is sorting by time. */
export function crashFileName(time: string, source: CrashSource): string {
  return `${time.replace(/\D/g, "").slice(0, 17)}-${source}.json`;
}

/** The message and stack of an uncaught value. A value that is not an Error has no stack. */
export function describeError(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    const message = error.message ? `${error.name}: ${error.message}` : error.name;
    return { message, stack: error.stack ?? "" };
  }
  return { message: safeText(error), stack: "" };
}

/** The text stored on disk and shared. Pretty-printed, so a person can read it. */
export function formatCrashEntry(entry: CrashEntry): string {
  return JSON.stringify(entry, null, 2);
}

/** Reads one stored entry. Returns null for anything that is not an entry, so one bad file does not hide the rest. */
export function parseCrashEntry(text: string): CrashEntry | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const { time, source, message } = raw;
  if (typeof time !== "string" || typeof message !== "string" || !isSource(source)) return null;
  return {
    time,
    appVersion: textOr(raw.appVersion, "unknown"),
    androidVersion: textOr(raw.androidVersion, "unknown"),
    model: textOr(raw.model, "unknown"),
    source,
    message,
    stack: textOr(raw.stack, ""),
    acl: Array.isArray(raw.acl) ? raw.acl.filter((line): line is string => typeof line === "string") : [],
  };
}

/** The names to delete so that at most [max] crash files remain, oldest first. Names this store did not write are never returned. */
export function crashFilesToDelete(names: readonly string[], max = MAX_CRASH_ENTRIES): string[] {
  const kept = names.filter(isCrashFileName).sort();
  const excess = kept.length - max;
  return excess > 0 ? kept.slice(0, excess) : [];
}

function isSource(value: unknown): value is CrashSource {
  return (CRASH_SOURCES as readonly unknown[]).includes(value);
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function safeText(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "unknown error";
  }
}
