import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { ModifiedDot } from "./ModifiedDot";
import { typeScale } from "./tokens";
import { controlHeight, spacing, useTheme } from "./theme";

type Props = {
  label: string;
  /** Current value, or Như máy when the row is held. */
  value: string;
  /** True when the row differs from the saved set. Shows the ModifiedDot. */
  modified: boolean;
  divider?: boolean;
  onPress: () => void;
};

/** One setting in a stage: label, value, a ModifiedDot when it differs from the saved set, and a chevron to the row sheet. */
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
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
      <View style={styles.end}>
        <Text numberOfLines={1} style={[styles.value, { color: theme.secondary }]}>
          {value}
        </Text>
        {modified ? <ModifiedDot /> : null}
        <Text style={[styles.chevron, { color: theme.secondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: controlHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  label: { ...typeScale.callout, flexShrink: 1 },
  end: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  value: { ...typeScale.subhead, flexShrink: 1, textAlign: "right" },
  chevron: { ...typeScale.title3 },
});
