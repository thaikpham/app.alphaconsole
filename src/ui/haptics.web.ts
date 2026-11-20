// Web: haptics are silent. The browser Vibration API is missing on iOS and is ignored in background tabs, so no call is made.
import type { HapticKind } from "./haptics";

export function haptic(_kind: HapticKind): void {}
