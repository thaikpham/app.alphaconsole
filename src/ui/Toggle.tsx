import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";
import { ModifiedDot } from "./ModifiedDot";

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Shown under the label, for example Như máy when the switch is held. */
  detail?: string;
  modified?: boolean;
};

/** Switch row: label on the left, track on the right. Role switch. Tapping the row flips the value. */
export function Toggle({ label, value, onChange, detail, modified = false }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={modified ? `${label}, ${content.edit.modified}` : label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
          {modified ? <ModifiedDot /> : null}
        </View>
        {detail ? <Text style={[styles.detail, { color: theme.secondary }]}>{detail}</Text> : null}
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: value ? theme.high : theme.neutralTint, justifyContent: value ? "flex-end" : "flex-start" },
        ]}
      >
        <View style={[styles.thumb, { backgroundColor: value ? theme.onHigh : theme.card }]} />
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
  text: { flex: 1, gap: spacing.xs },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { ...typeScale.callout },
  detail: { ...typeScale.subhead },
  track: {
    width: 51,
    height: 31,
    borderRadius: radii.pill,
    padding: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  thumb: { width: 27, height: 27, borderRadius: 14 },
});
