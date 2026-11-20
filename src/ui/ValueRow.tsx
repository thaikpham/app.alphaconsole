import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "./tokens";
import { rowMinHeight, spacing, useTheme } from "./theme";

type Props = {
  label: string;
  value: string;
  tone?: "default" | "danger";
};

/** Read-only label and value. Body label, subhead value. No onPress, so no chevron. */
export function ValueRow({ label, value, tone = "default" }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
      <Text style={[styles.value, { color: tone === "danger" ? theme.danger : theme.secondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: rowMinHeight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  label: { ...typeScale.body, flexShrink: 1 },
  value: { ...typeScale.subhead, flexShrink: 1, textAlign: "right" },
});
