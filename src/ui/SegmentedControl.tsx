import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { haptic } from "./haptics";
import { springs } from "./motion";
import { glass, gesture, press, typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

export type SegmentOption<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Selected label uses the fieldLabel size (home tabs). Otherwise every label is subhead. */
  emphasizeSelected?: boolean;
};

// Track padding (SPEC-IOS §2): the thumb sits this far inside the track on every side.
const PAD = 3;

/**
 * Single-select track with a knob (SPEC-IOS §2). The knob follows the finger while dragging. On release it snaps to the
 * nearest segment with the bouncy spring, carrying the release velocity in. A tap picks a segment. Each change fires a
 * selection haptic. Reduce Motion sets the knob in place. Press feedback is scale, never opacity.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  emphasizeSelected = false,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const last = Math.max(0, options.length - 1);
  const slot = options.length > 0 ? Math.max(0, (width - PAD * 2) / options.length) : 0;
  // Knob position in segment units, 0 to last. Shared so the pan gesture can write it on the UI thread.
  const position = useSharedValue(index);
  const grab = useSharedValue(0);
  // Segment the last drag settled on, written on the UI thread. The sync effect skips it, because the knob is already settling there.
  const settleTo = useSharedValue(index);
  // Bumped on every drop or tap, so the knob re-syncs from `value` even when the parent rejects the change.
  const [settles, setSettles] = useState(0);

  // Picks segment i. Silent when it is already selected, so a tap or drag onto the current segment does nothing.
  const choose = useCallback(
    (i: number) => {
      setSettles((n) => n + 1);
      const option = options[i];
      if (!option || i === index) return;
      haptic("selection");
      onChange(option.value);
    },
    [index, onChange, options],
  );

  // Re-syncs the knob to `value` after each change and each settle. A rejected change leaves `value` as it was, so the
  // knob springs back to the selected segment. Under Reduce Motion it sits in place.
  useEffect(() => {
    const settled = settleTo.get() === index;
    settleTo.set(index);
    if (settled) return;
    if (reduce) {
      position.set(index);
      return;
    }
    position.set(withSpring(index, springs.bouncy));
  }, [index, settles, reduce, position, settleTo]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-gesture.dragSlopPx, gesture.dragSlopPx])
        .onStart(() => {
          grab.set(position.get());
        })
        .onUpdate((event) => {
          if (slot <= 0) return;
          position.set(Math.min(last, Math.max(0, grab.get() + event.translationX / slot)));
        })
        .onEnd((event) => {
          if (slot <= 0) return;
          const velocity = event.velocityX / slot;
          const target = Math.min(last, Math.max(0, Math.round(position.get() + velocity * gesture.flingProjectionS)));
          settleTo.set(target);
          position.set(reduce ? target : withSpring(target, { ...springs.bouncy, velocity }));
          scheduleOnRN(choose, target);
        }),
    [choose, grab, last, position, reduce, settleTo, slot],
  );

  const knob = useAnimatedStyle(
    () => ({
      width: slot,
      transform: [{ translateX: position.get() * slot }],
    }),
    [slot],
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="radiogroup"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.track, { backgroundColor: theme.fill }]}
      >
        <Reanimated.View pointerEvents="none" style={[styles.thumb, { backgroundColor: theme.segmentOn }, knob]} />
        {options.map((option, i) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => choose(i)}
              style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
            >
              <Text
                style={[
                  emphasizeSelected && selected ? styles.labelOn : styles.label,
                  { color: selected ? theme.label : theme.secondary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GestureDetector>
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
