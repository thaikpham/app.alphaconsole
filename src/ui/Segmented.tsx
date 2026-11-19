import { Pressable, StyleSheet, Text, View } from "react-native";
import { typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.track, { backgroundColor: theme.fill }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: theme.card, borderColor: theme.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, { color: selected ? theme.label : theme.secondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radii.control,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: controlHeight,
    borderRadius: radii.control - spacing.xs,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  label: { ...typeScale.subhead },
});
