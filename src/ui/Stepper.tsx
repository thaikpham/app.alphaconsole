import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "./tokens";
import { useTheme } from "./theme";

type Props = {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
};

/**
 * Android stub with the same API as Stepper.ios. Android edits numeric rows in the wheel,
 * so this only shows the value.
 */
export function Stepper({ value }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.value, { color: theme.label }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  value: { ...typeScale.title2 },
});
