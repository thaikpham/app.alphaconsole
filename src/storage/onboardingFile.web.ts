// The first-launch flag, kept in localStorage as onboarding.json ({"seen": true}) on the web. Same text as the native file.
import { parseOnboardingSeen, serializeOnboardingSeen } from "./onboarding.ts";

const KEY = "onboarding.json";

export async function loadOnboardingSeen(): Promise<boolean> {
  return parseOnboardingSeen(localStorage.getItem(KEY));
}

export async function saveOnboardingSeen(): Promise<void> {
  localStorage.setItem(KEY, serializeOnboardingSeen());
}
