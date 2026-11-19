import { useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Glass } from "./Glass";
import { typeScale } from "./tokens.ios";
import { controlHeight, motion, radii, spacing, useTheme, type IosPalette } from "./theme.ios";
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
 * Press feedback scales to 0.96. Glass never fades, so there is no opacity change.
 */
export function Button({ label, onPress, variant = "primary", disabled = false }: Props) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const pressIn = () => {
    Animated.timing(scale, { toValue: 0.96, duration: reduce ? 0 : 120, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    if (reduce) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: 1, ...motion.spring.btn, useNativeDriver: true }).start();
  };

  const text = <Text style={[styles.label, { color: labelColor(variant, disabled, theme) }]}>{label}</Text>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {variant === "primary" ? (
          <View style={[styles.capsule, { backgroundColor: disabled ? theme.disabled : theme.prime }]}>{text}</View>
        ) : variant === "secondary" ? (
          <Glass interactive={!disabled} style={styles.capsule}>
            {text}
          </Glass>
        ) : (
          <View style={styles.plain}>{text}</View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function labelColor(variant: ButtonVariant, disabled: boolean, theme: IosPalette): string {
  if (variant === "primary") return theme.onPrime;
  if (disabled) return theme.disabled;
  return variant === "secondary" ? theme.label : theme.accent;
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
