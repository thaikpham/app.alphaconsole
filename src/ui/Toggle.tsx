import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { ModifiedDot } from "./ModifiedDot";
import { ToggleSwitch } from "./ToggleSwitch";
import { typeScale } from "./tokens";
import { spacing, useTheme } from "./theme";
import { fontFamily } from "./v21";

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Shown under the label, for example Như máy when the switch is held. */
  detail?: string;
  modified?: boolean;
};

/** Native switch row (AlphaApp: min 56, label semibold). The row is the control: tapping anywhere flips the value. Role switch. */
export function Toggle({ label, value, onChange, detail, modified = false }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={modified ? `${label}, ${content.edit.modified}` : label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.press }]}
    >
      <View style={styles.text}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
          {modified ? <ModifiedDot /> : null}
        </View>
        {detail ? <Text style={[styles.detail, { color: theme.secondary }]}>{detail}</Text> : null}
      </View>
      <ToggleSwitch value={value} onValueChange={onChange} />
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
  },
  text: { flex: 1, gap: spacing.xs },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { ...typeScale.body, fontFamily: fontFamily.semibold },
  detail: { ...typeScale.subhead },
});
