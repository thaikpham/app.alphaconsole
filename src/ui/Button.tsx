import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Reanimated from "react-native-reanimated";
import { haptic } from "./haptics";
import { usePressScale } from "./motion";
import { typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme, type Palette } from "./theme";
import { v21 } from "./v21";

export type ButtonVariant = "primary" | "secondary" | "plain";

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

/**
 * Android v21 buttons (design/v21/SPEC.md §1.8, §2.4). 48 px tall, pill radius, label `title` 17/24 semibold.
 * Primary is a solid `prime` fill with white text: hover `primaryHover`, pressed `primaryActive`. Secondary is an outline
 * pill on the card fill. Plain is `accentText` text. Press feedback scales to `press.button`. Primary also gives a light
 * impact haptic.
 */
export function Button({ label, onPress, variant = "primary", disabled = false }: Props) {
  const theme = useTheme();
  const { style, onPressIn, onPressOut } = usePressScale("button");
  const [hovered, setHovered] = useState(false);

  const handlePress = () => {
    if (variant === "primary") haptic("impactLight");
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {({ pressed }) => (
        <Reanimated.View style={style}>
          <View style={[styles.base, surface(variant, disabled, pressed, hovered, theme)]}>
            <Text style={[styles.label, { color: labelColor(variant, disabled, theme) }]}>{label}</Text>
          </View>
        </Reanimated.View>
      )}
    </Pressable>
  );
}

function surface(variant: ButtonVariant, disabled: boolean, pressed: boolean, hovered: boolean, theme: Palette): ViewStyle {
  if (variant === "primary") {
    if (disabled) return { backgroundColor: theme.disabled };
    return { backgroundColor: pressed ? v21.primaryActive : hovered ? v21.primaryHover : v21.primary };
  }
  if (variant === "secondary") return { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.outline };
  return {};
}

function labelColor(variant: ButtonVariant, disabled: boolean, theme: Palette): string {
  if (variant === "primary") return theme.onPrime;
  if (disabled) return theme.disabled;
  return variant === "secondary" ? theme.label : theme.accentText;
}

const styles = StyleSheet.create({
  base: {
    minHeight: controlHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typeScale.button },
});
