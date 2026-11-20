// Haptic feedback on native. Fire-and-forget: no engine (or Low Power Mode) is not an error, so failures are swallowed.
import * as Haptics from "expo-haptics";

export type HapticKind = "selection" | "impactLight" | "impactRigid" | "success" | "warning" | "error";

const play: Record<HapticKind, () => Promise<void>> = {
  selection: () => Haptics.selectionAsync(),
  impactLight: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  impactRigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export function haptic(kind: HapticKind): void {
  try {
    play[kind]().catch(() => {});
  } catch {
    // A synchronous throw must not break the tap that triggered the haptic either.
  }
}
