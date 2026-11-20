import { Platform } from "react-native";
import { Host, Switch } from "@expo/ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "./theme";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * Native switch for the Toggle row: SwiftUI Toggle on iOS, tinted to `success`, and Compose Switch on Android. It takes no
 * touches of its own, so the row around it owns the press. The web build uses ToggleSwitch.web.tsx.
 */
export function ToggleSwitch({ value, onValueChange }: Props) {
  const theme = useTheme();
  return (
    <Host matchContents pointerEvents="none">
      <Switch
        value={value}
        onValueChange={onValueChange}
        modifiers={Platform.OS === "ios" ? [tint(theme.success)] : undefined}
      />
    </Host>
  );
}
