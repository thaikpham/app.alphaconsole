import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { animatedSpring } from "./motion";
import { ringPop, stagger, typeScale } from "./tokens";
import { useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

const SIZE = 208;
const RADIUS = 90;
const STROKE = 14;
const BOX = (RADIUS + STROKE / 2) * 2; // outer edge of the stroke
const INSET = (SIZE - BOX) / 2;
const QUARTERS = [0, 1, 2, 3];

/**
 * Four-quarter ring with "filled/4" in the middle (SPEC-IOS §4.7). Same drawing as ProgressRing.tsx: zero dependencies,
 * each quarter is a circle whose only visible border is the top side. When the ring completes it springs once,
 * scale 1 → ringPop.scale → 1, in place of the symbolEffect bounce. Reduce Motion skips the spring.
 * A quarter that fills or empties springs on the smooth spring, staggered by stagger.step. Reduce Motion sets it in place.
 */
export function ProgressRing({ filled }: { filled: number }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const done = Math.min(4, Math.max(0, Math.round(filled)));
  const complete = done === 4;
  const [pop] = useState(() => new Animated.Value(1));
  // Fill of each quarter: 0 empty, 1 filled. Springs can overshoot, so the border colour is clamped.
  const [fills] = useState(() => QUARTERS.map((q) => new Animated.Value(q < done ? 1 : 0)));
  // Fill each quarter was last sent to. A quarter that did not change still springs to its target, so a run cut short resumes.
  const targets = useRef(QUARTERS.map((q) => (q < done ? 1 : 0)));

  useEffect(() => {
    const next = QUARTERS.map((q) => (q < done ? 1 : 0));
    const prev = targets.current;
    targets.current = next;
    if (reduce) {
      fills.forEach((fill, q) => fill.setValue(next[q]));
      return;
    }
    let step = 0;
    const run = Animated.parallel(
      fills.map((fill, q) => {
        const delay = next[q] === prev[q] ? 0 : step++ * stagger.step;
        return Animated.sequence([Animated.delay(delay), animatedSpring(fill, next[q], "smooth", false)]);
      }),
    );
    run.start();
    return () => run.stop();
  }, [done, reduce, fills]);

  useEffect(() => {
    if (!complete || reduce) {
      pop.setValue(1);
      return;
    }
    const run = Animated.sequence([
      animatedSpring(pop, ringPop.scale, "smooth"),
      animatedSpring(pop, 1, "smooth"),
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
      {QUARTERS.map((quarter) => (
        <Animated.View
          key={quarter}
          style={[
            styles.quarter,
            {
              borderTopColor: fills[quarter].interpolate({
                inputRange: [0, 1],
                outputRange: [theme.separator, theme.accentText],
                extrapolate: "clamp",
              }),
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
