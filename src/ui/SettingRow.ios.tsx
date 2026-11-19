import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { ModifiedDot } from "./ModifiedDot";
import { typeScale } from "./tokens.ios";
import { rowMinHeight, spacing, useTheme } from "./theme.ios";

type Props = {
  label: string;
  /** Current value, or Như máy when the row is held. */
  value: string;
  /** True when the row differs from the saved set. Shows the ModifiedDot. */
  modified: boolean;
  divider?: boolean;
  onPress: () => void;
};

/** One setting in a stage: label, ModifiedDot and value, then a drawn chevron to the row sheet. */
export function SettingRow({ label, value, modified, divider = false, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}${modified ? `, ${content.edit.modified}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
        pressed && { backgroundColor: theme.press },
      ]}
    >
      <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
      <View style={styles.end}>
        {modified ? <ModifiedDot /> : null}
        <Text numberOfLines={1} style={[styles.value, { color: theme.secondary }]}>
          {value}
        </Text>
        <View style={[styles.chevron, { borderColor: theme.secondary }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: rowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: { ...typeScale.body, flexShrink: 1 },
  end: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  value: { ...typeScale.subhead, flexShrink: 1, textAlign: "right" },
  chevron: {
    width: 8,
    height: 8,
    marginLeft: spacing.xs,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
});
