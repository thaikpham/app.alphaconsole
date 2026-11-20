import { useEffect, useState } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./theme";
import { durations } from "./tokens";

export type ScrollEdgeProps = {
  edge: "top" | "bottom";
  /** True once the content has scrolled under this edge. */
  scrolled: boolean;
  /** Depth of the fade. Gap: 40. */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** `#rrggbb` to `rgba(r, g, b, a)`. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Fades scrolled content into the page background at a screen edge, so text under a bar does not clash with it.
 * Fades in over `durations.short` once `scrolled` is true. Opacity only, so Reduce Motion keeps it (M9).
 */
export function ScrollEdge({ edge, scrolled, height = 40, style }: ScrollEdgeProps) {
  const { bg } = useTheme();
  const [opacity] = useState(() => new Animated.Value(scrolled ? 1 : 0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: scrolled ? 1 : 0,
      duration: durations.short,
      useNativeDriver: true,
    }).start();
  }, [opacity, scrolled]);

  const direction = edge === "top" ? "to bottom" : "to top";
  const fade = `linear-gradient(${direction}, ${bg}, ${withAlpha(bg, 0)})`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.base, edge === "top" ? styles.top : styles.bottom, { height, opacity, experimental_backgroundImage: fade }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { position: "absolute", left: 0, right: 0 },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
