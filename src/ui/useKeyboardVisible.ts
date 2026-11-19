import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/** True while the soft keyboard is up. Uses keyboardDidShow/keyboardDidHide, which exist on both iOS and Android. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}
