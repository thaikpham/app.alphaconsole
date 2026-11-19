// App version and device model for crash entries. The version is the one in app.json.
import Constants from "expo-constants";
import { Platform } from "react-native";

/** The version in app.json, e.g. 0.9.0. */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? "unknown";
}

/** The Android release and the device model, e.g. 14 and Pixel 8. */
export function deviceInfo(): { androidVersion: string; model: string } {
  const constants = Platform.constants;
  const release = "Release" in constants ? constants.Release : undefined;
  const model = "Model" in constants ? constants.Model : undefined;
  return { androidVersion: release ?? "unknown", model: model ?? "unknown" };
}
