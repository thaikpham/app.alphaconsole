import { useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";
import { Glass } from "./Glass";
import { haptic } from "./haptics";
import { usePressScale } from "./motion";
import { durations, typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme, type Palette } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

export type ButtonVariant = "primary" | "secondary" | "plain";

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

/**
 * Primary is a solid `prime` capsule, secondary is Liquid Glass, plain is `accent` text.
 * Press feedback scales to `press.button` (snappy in, bouncy out). Primary also gives a light impact haptic. Glass also
 * lights a soft glow on the non-native fallback. Reduce Motion drops the animation and keeps the end state.
 */
export function Button({ label, onPress, variant = "primary", disabled = false }: Props) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const { style, onPressIn, onPressOut } = usePressScale("button");
  const [glow] = useState(() => new Animated.Value(0));

  const handlePress = () => {
    if (variant === "primary") haptic("impactLight");
    onPress();
  };

  const pressIn = () => {
    onPressIn();
    Animated.timing(glow, { toValue: 1, duration: reduce ? 0 : durations.micro, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    onPressOut();
    Animated.timing(glow, { toValue: 0, duration: reduce ? 0 : durations.short, useNativeDriver: true }).start();
  };

  const text = <Text style={[styles.label, { color: labelColor(variant, disabled, theme) }]}>{label}</Text>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Reanimated.View style={style}>
        {variant === "primary" ? (
          <View style={[styles.capsule, { backgroundColor: disabled ? theme.disabled : theme.prime }]}>{text}</View>
        ) : variant === "secondary" ? (
          <Glass interactive={!disabled} glow={glow} style={styles.capsule}>
            {text}
          </Glass>
        ) : (
          <View style={styles.plain}>{text}</View>
        )}
      </Reanimated.View>
    </Pressable>
  );
}

function labelColor(variant: ButtonVariant, disabled: boolean, theme: Palette): string {
  if (variant === "primary") return theme.onPrime;
  if (disabled) return theme.disabled;
  return variant === "secondary" ? theme.label : theme.accentText;
}

const styles = StyleSheet.create({
  capsule: {
    minHeight: controlHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  plain: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typeScale.button },
});
