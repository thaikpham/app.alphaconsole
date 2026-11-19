import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "./tokens";
import { useTheme } from "./theme";

const SIZE = 208;
const RADIUS = 90;
const STROKE = 14;
const BOX = (RADIUS + STROKE / 2) * 2; // outer edge of the stroke
const INSET = (SIZE - BOX) / 2;

/**
 * Four-quarter ring with "filled/4" in the middle. Zero dependencies: each quarter is a circle whose
 * only visible border is the top side (a 90 degree arc), rotated into place clockwise from 12 o'clock.
 */
export function ProgressRing({ filled }: { filled: number }) {
  const theme = useTheme();
  const done = Math.min(4, Math.max(0, Math.round(filled)));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 4, now: done, text: `${done}/4` }}
      style={styles.frame}
    >
      {[0, 1, 2, 3].map((quarter) => (
        <View
          key={quarter}
          style={[
            styles.quarter,
            {
              borderTopColor: quarter < done ? theme.accent : theme.separator,
              transform: [{ rotate: `${45 + 90 * quarter}deg` }],
            },
          ]}
        />
      ))}
      <Text style={[styles.count, { color: theme.label }]}>{`${done}/4`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  quarter: {
    position: "absolute",
    top: INSET,
    left: INSET,
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    borderWidth: STROKE,
    borderColor: "transparent",
  },
  count: { ...typeScale.title2 },
});
