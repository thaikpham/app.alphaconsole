// Crash capture for release builds. Installed once at startup from src/app/_layout.tsx.
// A JS error is recorded, then the previous global handler still runs, so RN's own handling is kept.
// RN tracks promise rejections only in __DEV__, so Hermes is asked for them directly.
import { Platform } from "react-native";

import { describeError, type CrashEntry, type CrashSource } from "@/crash/entry";
import { appVersion, deviceInfo } from "@/crash/appInfo";
import { recentAcl } from "@/crash/ring";
import { writeCrashEntry } from "@/crash/store";

type HermesRejectionTracker = {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, reason: unknown) => void;
    onHandled: (id: number) => void;
  }) => void;
};

let installed = false;

/** Writes one entry to the crash folder with the current ACL lines. Never throws. */
export function recordCrash(source: CrashSource, error: unknown): void {
  try {
    const { message, stack } = describeError(error);
    const entry: CrashEntry = {
      time: new Date().toISOString(),
      appVersion: appVersion(),
      ...deviceInfo(),
      source,
      message,
      stack,
      acl: [...recentAcl()],
    };
    writeCrashEntry(entry);
  } catch {
    // Logging must not hide the error it was asked to record.
  }
}

/** The web has no ErrorUtils or Hermes tracker. Window events carry the same errors. */
function installWebHandlers(): void {
  window.addEventListener("error", (event) => recordCrash("js", event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => recordCrash("promise", event.reason));
}

/** Installs the JS handlers once per process. Calls after the first do nothing. */
export function installCrashLog(): void {
  if (installed) return;
  installed = true;

  if (Platform.OS === "web") {
    installWebHandlers();
    return;
  }

  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    recordCrash("js", error);
    previous(error, isFatal);
  });

  const hermes = (globalThis as { HermesInternal?: HermesRejectionTracker | null }).HermesInternal;
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, reason) => recordCrash("promise", reason),
    onHandled: () => undefined,
  });
}
