// The first-launch flag (Documents/onboarding.json, {"seen": true}). Read once at app start by OnboardingProvider.
import { File, Paths } from "expo-file-system";
import { parseOnboardingSeen, serializeOnboardingSeen } from "./onboarding.ts";

const file = new File(Paths.document, "onboarding.json");

export async function loadOnboardingSeen(): Promise<boolean> {
  return parseOnboardingSeen(file.exists ? await file.text() : null);
}

export async function saveOnboardingSeen(): Promise<void> {
  if (!file.exists) file.create();
  await file.write(serializeOnboardingSeen());
}
