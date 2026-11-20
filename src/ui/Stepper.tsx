import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { haptic } from "./haptics";
import { radii, useTheme } from "./theme";
import { fontFamily } from "./v21";

type Props = {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
};

// Android stepper (AlphaApp shStep): one 72 dp row on the fill colour, Giảm left, the value centred, Tăng right.
const ROW = 72;
const GLYPH = 28;
const STROKE = 2.4;

/** Row sheet control for option lists longer than SEGMENT_LIMIT. */
export function Stepper({ value, onDecrease, onIncrease, canDecrease = true, canIncrease = true }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.fill }]}>
      <Step label={content.edit.decrease} glyph="minus" enabled={canDecrease} onPress={onDecrease} />
      <Text numberOfLines={1} style={[styles.value, { color: theme.label }]}>
        {value}
      </Text>
      <Step label={content.edit.increase} glyph="plus" enabled={canIncrease} onPress={onIncrease} />
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
      onPress={() => {
        haptic("selection");
        onPress();
      }}
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
    height: ROW,
    borderRadius: radii.field,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  step: { width: ROW, height: ROW, alignItems: "center", justifyContent: "center" },
  value: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 30,
    lineHeight: 40,
    fontFamily: fontFamily.bold,
    fontVariant: ["tabular-nums"],
  },
  glyph: { width: GLYPH, height: GLYPH },
  bar: { position: "absolute", borderRadius: STROKE / 2 },
  horizontal: { left: 0, right: 0, top: (GLYPH - STROKE) / 2, height: STROKE },
  vertical: { top: 0, bottom: 0, left: (GLYPH - STROKE) / 2, width: STROKE },
});
