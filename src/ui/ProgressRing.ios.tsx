import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { typeScale } from "./tokens.ios";
import { motion, useTheme } from "./theme.ios";
import { useReduceMotion } from "./useReduceMotion";

const SIZE = 208;
const RADIUS = 90;
const STROKE = 14;
const BOX = (RADIUS + STROKE / 2) * 2; // outer edge of the stroke
const INSET = (SIZE - BOX) / 2;

/**
 * Four-quarter ring with "filled/4" in the middle (SPEC-IOS §4.7). Same drawing as ProgressRing.tsx: zero dependencies,
 * each quarter is a circle whose only visible border is the top side. When the ring completes it springs once,
 * scale 1 → 1.08 → 1, in place of the symbolEffect bounce. Reduce Motion skips the spring.
 */
export function ProgressRing({ filled }: { filled: number }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const done = Math.min(4, Math.max(0, Math.round(filled)));
  const complete = done === 4;
  const [pop] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!complete || reduce) {
      pop.setValue(1);
      return;
    }
    const run = Animated.sequence([
      Animated.spring(pop, { toValue: 1.08, ...motion.spring.btn, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, ...motion.spring.btn, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [complete, reduce, pop]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 4, now: done, text: `${done}/4` }}
      style={[styles.frame, { transform: [{ scale: pop }] }]}
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
    </Animated.View>
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
