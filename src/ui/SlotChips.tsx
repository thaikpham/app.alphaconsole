import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { content } from "@/content";
import { haptic } from "./haptics";
import { ModifiedDot } from "./ModifiedDot";
import { springs } from "./motion";
import { typeScale } from "./tokens";
import { radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { fontFamily } from "./v21";

/** `name` is optional and only the iOS picker shows it, on the selected pill. */
export type SlotItem = { id: string; label: string; modified?: boolean; name?: string };

type Props = {
  slots: readonly SlotItem[];
  value: string;
  onChange: (id: string) => void;
};

// AlphaApp slot segment: 48 px buttons on the track, each pill inset 4 px (40 px tall). Unselected buttons are 60 px wide.
const TRACK_HEIGHT = 48;
const INSET = 4;
const BASIS = 60;
const PILL_RADIUS = (TRACK_HEIGHT - 2 * INSET) / 2;

/** Slot picker (M1 to M4) on a solid track (L1). The selected pill grows with a spring and shows its slot name. */
export function SlotChips({ slots, value, onChange }: Props) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  // Real widths, not flexGrow: an animated flexGrow could leave the old pill at 0 width on Android (M1 vanished when M2 was picked).
  const selectedWidth = Math.max(BASIS, trackWidth - (slots.length - 1) * BASIS);
  const choose = (id: string) => {
    if (id !== value) haptic("selection");
    onChange(id);
  };
  return (
    <View accessibilityRole="radiogroup">
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        style={[styles.track, { backgroundColor: theme.separator }]}
      >
        {slots.map((slot) => (
          <SlotChip
            key={slot.id}
            slot={slot}
            selected={slot.id === value}
            width={trackWidth > 0 ? (slot.id === value ? selectedWidth : BASIS) : null}
            onPress={() => choose(slot.id)}
          />
        ))}
      </View>
    </View>
  );
}

function SlotChip({
  slot,
  selected,
  width,
  onPress,
}: {
  slot: SlotItem;
  selected: boolean;
  /** Target width in px once the track is measured; null before that (flex layout). */
  width: number | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const animatedWidth = useSharedValue(width ?? 0);
  const measured = width !== null;

  useEffect(() => {
    if (width === null) return;
    // First measure and Reduce Motion jump straight to the width; later changes spring (smooth).
    if (reduce || animatedWidth.get() === 0) animatedWidth.set(width);
    else animatedWidth.set(withSpring(width, springs.smooth));
  }, [width, reduce, animatedWidth]);

  const widthStyle = useAnimatedStyle(() => ({ width: animatedWidth.get() }));

  const accessibleName = `${slot.label}${slot.name ? `, ${slot.name}` : ""}${slot.modified ? `, ${content.edit.modified}` : ""}`;

  return (
    <Animated.View style={measured ? [styles.slot, widthStyle] : [styles.slot, selected ? styles.fill : styles.fixed]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibleName}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={styles.hit}
      >
        <View
          style={[
            styles.chip,
            { paddingHorizontal: selected ? spacing.s14 : spacing.xs },
            // Background and shadow are always set (transparent when off): adding them at runtime made Android drop the radius.
            selected ? [styles.on, { backgroundColor: theme.segmentOn }] : styles.off,
          ]}
        >
          <Text style={[selected ? styles.labelOn : styles.label, { color: selected ? theme.label : theme.secondary }]}>
            {slot.label}
          </Text>
          {selected && slot.name ? (
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { color: theme.label }]}>
              {`· ${slot.name}`}
            </Text>
          ) : null}
          {slot.modified ? <ModifiedDot /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    flexDirection: "row",
    borderRadius: radii.pill,
  },
  slot: { minWidth: 0, overflow: "hidden" },
  fill: { flex: 1 },
  fixed: { width: BASIS },
  hit: { flex: 1, padding: INSET },
  chip: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    // Exact half height, not radii.pill: Android does not re-clamp a huge radius after Reanimated changes the width,
    // so the pill went square once it moved.
    borderRadius: PILL_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  // Design: 0 1px 2px rgba(11,13,18,.14) under the selected pill.
  on: { boxShadow: "0 1px 2px rgba(11, 13, 18, 0.14)" },
  off: { backgroundColor: "transparent", boxShadow: "0 1px 2px rgba(11, 13, 18, 0)" },
  label: { ...typeScale.subhead, fontFamily: fontFamily.medium, flexShrink: 0 },
  labelOn: { ...typeScale.subhead, fontFamily: fontFamily.semibold, flexShrink: 0 },
  name: { ...typeScale.subhead, flexShrink: 1, minWidth: 0 },
});
