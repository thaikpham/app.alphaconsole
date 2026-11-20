// Web: react-native-web has no working Alert, so the browser's own confirm dialog asks. Its buttons are the browser's.
import type { ConfirmOptions } from "./confirm";

export function confirmDestructive({ title, message, onConfirm }: ConfirmOptions): void {
  if (window.confirm(`${title}\n\n${message}`)) onConfirm();
}
