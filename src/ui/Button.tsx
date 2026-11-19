import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme, type Palette } from "./theme";

export type ButtonVariant = "primary" | "secondary" | "plain";

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

/** Only primary uses the accent fill. Secondary and plain stay neutral. */
function variantPaint(variant: ButtonVariant, theme: Palette): { container: ViewStyle; label: string } {
  if (variant === "primary") return { container: { backgroundColor: theme.accent }, label: theme.onAccent };
  if (variant === "secondary") {
    return { container: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.separator }, label: theme.label };
  }
  return { container: { backgroundColor: "transparent" }, label: theme.label };
}

export function Button({ label, onPress, variant = "primary", disabled = false }: Props) {
  const theme = useTheme();
  const paint = variantPaint(variant, theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, paint.container, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.label, { color: paint.label }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: controlHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  label: { ...typeScale.button },
});
