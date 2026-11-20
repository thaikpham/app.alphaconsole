import { Switch } from "react-native";
import { useTheme } from "./theme";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/** Web switch for the Toggle row: the RN Switch in the app palette. @expo/ui has no web Switch that matches it, so it stays out of the web bundle. */
export function ToggleSwitch({ value, onValueChange }: Props) {
  const theme = useTheme();
  return (
    <Switch
      pointerEvents="none"
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.tog, true: theme.success }}
      ios_backgroundColor={theme.tog}
    />
  );
}
