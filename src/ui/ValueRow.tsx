import { StyleSheet, Text, View } from "react-native";
import { fonts, typeScale } from "./tokens";
import { spacing, useTheme } from "./theme";

type Props = {
  label: string;
  value: string;
  tone?: "default" | "danger";
};

export function ValueRow({ label, value, tone = "default" }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.secondary }]}>{label}</Text>
      <Text style={[styles.value, { color: tone === "danger" ? theme.danger : theme.label }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  label: { ...typeScale.callout, flexShrink: 1 },
  value: { ...typeScale.callout, fontFamily: fonts.medium, flexShrink: 1, textAlign: "right" },
});
