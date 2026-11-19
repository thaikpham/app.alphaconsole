// The first-launch flag (onboarding.json). Pure: text in, flag out. The file I/O lives in onboardingFile.ts.

/** True only for a saved {"seen": true}. A missing, unreadable or other file means the intro has not been seen. */
export function parseOnboardingSeen(text: string | null): boolean {
  if (text === null) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && "seen" in parsed && parsed.seen === true;
  } catch {
    return false;
  }
}

export function serializeOnboardingSeen(): string {
  return JSON.stringify({ seen: true });
}
