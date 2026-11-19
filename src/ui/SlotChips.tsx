import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, typeScale } from "./tokens";
import { ModifiedDot } from "./ModifiedDot";
import { controlHeight, motion, radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

export type SlotItem = { id: string; label: string; modified?: boolean };

type Props = {
  slots: readonly SlotItem[];
  value: string;
  onChange: (id: string) => void;
};

const BASIS = 60;

/** Slot picker (M1 to M4). The selected slot grows to fill the row; the others stay 60px wide. */
export function SlotChips({ slots, value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.track, { backgroundColor: theme.fill }]}>
      {slots.map((slot) => (
        <SlotChip key={slot.id} slot={slot} selected={slot.id === value} onPress={() => onChange(slot.id)} />
      ))}
    </View>
  );
}

function SlotChip({ slot, selected, onPress }: { slot: SlotItem; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [grow] = useState(() => new Animated.Value(selected ? 1 : 0));

  useEffect(() => {
    Animated.timing(grow, {
      toValue: selected ? 1 : 0,
      duration: reduce ? 0 : motion.emphasized.duration,
      easing: motion.emphasized.easing,
      useNativeDriver: false, // flexGrow is layout, so the native driver cannot run it
    }).start();
  }, [selected, reduce, grow]);

  return (
    <Animated.View style={{ flexBasis: BASIS, flexGrow: grow }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={slot.label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          selected && [styles.raised, { backgroundColor: theme.segmentOn }],
          pressed && styles.pressed,
        ]}
      >
        <Text style={[selected ? styles.labelOn : styles.label, { color: selected ? theme.label : theme.secondary }]}>
          {slot.label}
        </Text>
        {slot.modified ? <ModifiedDot style={styles.dot} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radii.control,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
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
  dot: { position: "absolute", top: spacing.sm, right: spacing.sm },
});
