import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { radii, rowMinHeight, spacing, useTheme } from "./theme";

type Props = {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
};

const CAPSULE_HEIGHT = 44;
const STEP_WIDTH = 56;
const GLYPH = 20;
const STROKE = 2.4;

/** Value on the left, then one 44px fill capsule holding Giảm, a divider, and Tăng. */
export function Stepper({ value, onDecrease, onIncrease, canDecrease = true, canIncrease = true }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text numberOfLines={1} style={[styles.value, { color: theme.label }]}>
        {value}
      </Text>
      <View style={[styles.capsule, { backgroundColor: theme.fill }]}>
        <Step label={content.edit.decrease} glyph="minus" enabled={canDecrease} onPress={onDecrease} />
        <View style={[styles.divider, { backgroundColor: theme.fill2 }]} />
        <Step label={content.edit.increase} glyph="plus" enabled={canIncrease} onPress={onIncrease} />
      </View>
    </View>
  );
}

function Step({
  label,
  glyph,
  enabled,
  onPress,
}: {
  label: string;
  glyph: "minus" | "plus";
  enabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = enabled ? theme.accentText : theme.disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.step, pressed && enabled && { backgroundColor: theme.fill2 }]}
    >
      <View style={styles.glyph}>
        <View style={[styles.bar, styles.horizontal, { backgroundColor: color }]} />
        {glyph === "plus" ? <View style={[styles.bar, styles.vertical, { backgroundColor: color }]} /> : null}
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
  value: {
    flexShrink: 1,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  capsule: {
    height: CAPSULE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  step: { width: STEP_WIDTH, height: CAPSULE_HEIGHT, alignItems: "center", justifyContent: "center" },
  divider: { width: 1, height: 20 },
  glyph: { width: GLYPH, height: GLYPH },
  bar: { position: "absolute", borderRadius: STROKE / 2 },
  horizontal: { left: 0, right: 0, top: (GLYPH - STROKE) / 2, height: STROKE },
  vertical: { top: 0, bottom: 0, left: (GLYPH - STROKE) / 2, width: STROKE },
});
