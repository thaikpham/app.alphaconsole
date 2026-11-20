import { useCallback, useState } from "react";
import { Animated, Easing } from "react-native";
import { durations, press, springs as tokenSprings, exitEase } from "./tokens";
import { useReduceMotion } from "./useReduceMotion";

// Motion helpers over the generated spring and duration tokens (living-glass M2). Not imported by theme.ts or tokens.ts,
// so the plain Node tests can load those two files.

export { durations, press };

type SpringToken = { stiffness: number; damping: number; mass: number };
const pick = ({ stiffness, damping, mass }: SpringToken): SpringToken => ({ stiffness, damping, mass });

/** Spring configs for Reanimated (`withSpring`) and RN Animated. `settleMs` is dropped, it is a token-only hint. */
export const springs = {
  snappy: pick(tokenSprings.snappy),
  smooth: pick(tokenSprings.smooth),
  bouncy: pick(tokenSprings.bouncy),
  sheet: pick(tokenSprings.sheet),
  morph: pick(tokenSprings.morph),
};

export type SpringName = keyof typeof springs;

/** Sheet exit curve: ease-in, from the `exitEase` token. */
const [x1, y1, x2, y2] = exitEase;
export const exitEasing = Easing.bezier(x1, y1, x2, y2);

/** RN Animated spring by name. The caller starts it. Pass `useNativeDriver: false` for layout props. */
export function animatedSpring(
  value: Animated.Value,
  toValue: number,
  name: SpringName,
  useNativeDriver = true,
): Animated.CompositeAnimation {
  return Animated.spring(value, { toValue, ...springs[name], useNativeDriver });
}

/**
 * Press scale for a button or card: presses in with `snappy` to `press[kind]`, releases with `bouncy` back to 1.
 * Under Reduce Motion the scale stays at 1.
 */
export function usePressScale(kind: "button" | "card") {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const onPressIn = useCallback(() => {
    if (reduce) return;
    animatedSpring(scale, press[kind], "snappy").start();
  }, [reduce, scale, kind]);

  const onPressOut = useCallback(() => {
    if (reduce) return;
    animatedSpring(scale, 1, "bouncy").start();
  }, [reduce, scale]);

  return { scale, onPressIn, onPressOut };
}
