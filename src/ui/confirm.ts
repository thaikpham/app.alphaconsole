// Asks before a destructive action: a cancel button and an action button, as the system alert shows them.
import { Alert } from "react-native";

export type ConfirmOptions = { title: string; message: string; cancel: string; action: string; onConfirm: () => void };

export function confirmDestructive({ title, message, cancel, action, onConfirm }: ConfirmOptions): void {
  Alert.alert(title, message, [
    { text: cancel, style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}
