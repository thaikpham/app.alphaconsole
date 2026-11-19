import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Tabs whose selected segment is raised on a fill, with no border. Same props as Segmented. */
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
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
              selected && [styles.raised, { backgroundColor: theme.segmentOn }],
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                selected ? styles.labelOn : styles.label,
                { color: selected ? theme.label : theme.secondary },
              ]}
            >
              {option.label}
            </Text>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  raised: {
    shadowColor: "#0b0d12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  label: { ...typeScale.subhead },
  labelOn: { ...typeScale.subhead, fontFamily: fonts.semibold },
});
