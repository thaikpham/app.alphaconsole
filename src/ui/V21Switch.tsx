import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { motion, v21 } from "./v21";

/**
 * AlphaApp switch (Picture Profile): 52×32 track, 26 px knob 3 px in. On: track `hi`, knob `hitx`; off: track `ol`, knob white.
 * Knob slides 300 ms on the design's background ease. Display only: the row around it owns the press.
 */
export function V21Switch({ value }: { value: boolean }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    const [a, b, c, d] = motion.backgroundEase;
    x.set(reduce ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: motion.backgroundMs, easing: Easing.bezier(a, b, c, d) }));
  }, [value, reduce, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * 20 }] }));
  return (
    <View pointerEvents="none" style={[styles.track, { backgroundColor: value ? theme.high : theme.outline }]}>
      <Reanimated.View style={[styles.knob, { backgroundColor: value ? theme.onHigh : v21.white }, knob]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 999 },
  knob: { position: "absolute", top: 3, left: 3, width: 26, height: 26, borderRadius: 13 },
});
