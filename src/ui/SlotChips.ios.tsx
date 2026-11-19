import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { Glass } from "./Glass";
import { ModifiedDot } from "./ModifiedDot";
import { typeScale } from "./tokens.ios";
import { motion, radii, spacing, useTheme } from "./theme.ios";
import { useReduceMotion } from "./useReduceMotion";

/** `name` is optional and only the iOS picker shows it, on the selected pill. */
export type SlotItem = { id: string; label: string; modified?: boolean; name?: string };

type Props = {
  slots: readonly SlotItem[];
  value: string;
  onChange: (id: string) => void;
};

// Canvas v16: 44px glass track, pills inset 3px from its edge (38px tall). Unselected pills are 56px wide.
const TRACK_HEIGHT = 44;
const INSET = 3;
const BASIS = 56;

/** Slot picker (M1 to M4) on a glass track. The selected pill grows with a spring and shows its slot name. */
export function SlotChips({ slots, value, onChange }: Props) {
  return (
    <View accessibilityRole="radiogroup">
      <Glass style={styles.track}>
        {slots.map((slot) => (
          <SlotChip key={slot.id} slot={slot} selected={slot.id === value} onPress={() => onChange(slot.id)} />
        ))}
      </Glass>
    </View>
  );
}

function SlotChip({ slot, selected, onPress }: { slot: SlotItem; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [grow] = useState(() => new Animated.Value(selected ? 1 : 0));
  // A spring can overshoot past 1 or below 0, and a negative flexGrow is invalid, so clamp it.
  const flexGrow = useMemo(
    () => grow.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
    [grow],
  );

  useEffect(() => {
    const toValue = selected ? 1 : 0;
    if (reduce) {
      grow.setValue(toValue);
      return;
    }
    Animated.spring(grow, { toValue, ...motion.spring.seg, useNativeDriver: false }).start(); // flexGrow is layout
  }, [selected, reduce, grow]);

  const label = selected && slot.name ? `${slot.label} · ${slot.name}` : slot.label;
  const accessibleName = `${slot.label}${slot.name ? `, ${slot.name}` : ""}${slot.modified ? `, ${content.edit.modified}` : ""}`;

  return (
    <Animated.View style={{ flexBasis: BASIS, flexGrow }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibleName}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.chip, selected && { backgroundColor: theme.chip }, pressed && styles.pressed]}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[selected ? styles.labelOn : styles.label, { color: selected ? theme.chipfg : theme.secondary }]}
        >
          {label}
        </Text>
        {slot.modified ? <ModifiedDot style={styles.dot} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    flexDirection: "row",
    borderRadius: radii.pill,
    padding: INSET,
  },
  chip: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.s14,
  },
  pressed: { opacity: 0.85 },
  label: { ...typeScale.subhead, flexShrink: 1 },
  labelOn: { ...typeScale.subhead, fontWeight: "600", flexShrink: 1 },
  dot: { position: "absolute", top: spacing.s6, right: spacing.s6 },
});
