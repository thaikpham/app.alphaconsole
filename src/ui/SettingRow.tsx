import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { ModifiedDot } from "./ModifiedDot";
import { typeScale } from "./tokens";
import { spacing, useTheme } from "./theme";

type Props = {
  label: string;
  /** Current value, or Như máy when the row is held. */
  value: string;
  /** True when the row differs from the saved set. Shows the ModifiedDot. */
  modified: boolean;
  divider?: boolean;
  onPress: () => void;
};

/** One setting in a stage group (AlphaApp row): min 56, label, ModifiedDot, value, then a 20 dp chevron to the row sheet. Held reads as a regular secondary value. */
export function SettingRow({ label, value, modified, divider = false, onPress }: Props) {
  const theme = useTheme();
  const held = value === content.edit.held;
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
      <Text style={[typeScale.body, styles.label, { color: theme.label }]}>{label}</Text>
      <View style={styles.end}>
        {modified ? <ModifiedDot /> : null}
        <Text
          numberOfLines={1}
          style={[held ? typeScale.body : typeScale.title, styles.value, { color: held ? theme.secondary : theme.label }]}
        >
          {value}
        </Text>
        <View style={styles.chevronBox}>
          <View style={[styles.chevron, { borderColor: theme.secondary }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingLeft: spacing.xl,
    paddingRight: spacing.s14,
  },
  label: { flexShrink: 1 },
  end: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  value: { flexShrink: 1, textAlign: "right" },
  chevronBox: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
});
