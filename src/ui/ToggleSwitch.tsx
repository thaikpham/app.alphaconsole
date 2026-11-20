import { Platform } from "react-native";
import { Host, Switch } from "@expo/ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "./theme";
import { V21Switch } from "./V21Switch";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * Native switch for the Toggle row: SwiftUI Toggle on iOS, tinted to `success`, and the AlphaApp switch (V21Switch) on Android. It takes no
 * touches of its own, so the row around it owns the press. The web build uses ToggleSwitch.web.tsx.
 */
export function ToggleSwitch({ value, onValueChange }: Props) {
  const theme = useTheme();
  // Android draws the AlphaApp switch so it matches the design and the web console; iOS keeps the SwiftUI Toggle.
  if (Platform.OS !== "ios") return <V21Switch value={value} />;
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
