import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { animatedSpring } from "./motion";
import { glass, press, typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Track padding (SPEC-IOS §2): the thumb sits this far inside the track on every side.
const PAD = 3;

/**
 * Tabs for the home preset list (SPEC-IOS §2, `.seg`). Same props as SegmentedTabs.tsx. The thumb slides on the bouncy
 * spring and Reduce Motion sets it in place. The selected label is fieldLabel. Press feedback is scale, never opacity.
 */
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const [slide] = useState(() => new Animated.Value(index));
  const slot = options.length > 0 ? (width - PAD * 2) / options.length : 0;

  useEffect(() => {
    if (reduce) {
      slide.setValue(index);
      return;
    }
    const run = animatedSpring(slide, index, "bouncy");
    run.start();
    return () => run.stop();
  }, [index, reduce, slide]);

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.fill }]}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: slot,
              backgroundColor: theme.segmentOn,
              transform: [{ translateX: Animated.multiply(slide, slot) }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
          >
            <Text style={[selected ? styles.labelOn : styles.label, { color: selected ? theme.label : theme.secondary }]}>
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
    borderRadius: radii.pill,
    padding: PAD,
  },
  // Inset highlight: a hairline light edge on the thumb (glass.highlightTop).
  thumb: {
    position: "absolute",
    left: PAD,
    top: PAD,
    bottom: PAD,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `rgba(255, 255, 255, ${glass.highlightTop})`,
  },
  segment: {
    flex: 1,
    minHeight: controlHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  pressed: { transform: [{ scale: press.button }] },
  label: { ...typeScale.subhead },
  labelOn: { ...typeScale.fieldLabel },
});
