// One set on the preset home (SPEC §2.4.2). Card surface, a 4-slot grid with M labels, and a selection badge.
// The 2 px ring is transparent when unselected, so the layout does not shift. The actions (children) show only while selected.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";

import type { PresetSet } from "@/core/web/lib/presetSets";
import { sceneFor } from "@/home/sceneMap";
import { Card } from "@/ui/Card";
import { usePressScale } from "@/ui/motion";
import { SceneThumb } from "@/ui/SceneThumb";
import { CheckIcon } from "@/ui/StatusIcons";
import { photoLabel, typeScale } from "@/ui/tokens";
import { radii, spacing, useTheme } from "@/ui/theme";

type Props = {
  set: PresetSet;
  /** Line under the name (author). Omitted when there is none. */
  byline?: string;
  selected: boolean;
  onPress: () => void;
  children?: ReactNode;
};

/** Press is scale, never opacity. */
export function PresetCard({ set, byline, selected, onPress, children }: Props) {
  const theme = useTheme();
  const pressScale = usePressScale("card");
  return (
    <View style={[styles.ring, { borderColor: selected ? theme.label : "transparent" }]}>
      <Card>
        <Pressable
          onPress={onPress}
          onPressIn={pressScale.onPressIn}
          onPressOut={pressScale.onPressOut}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
        >
          <Reanimated.View style={[styles.body, pressScale.style]}>
            <View style={styles.header}>
              <View style={styles.titles}>
                <Text style={[typeScale.title3, { color: theme.label }]}>{set.name}</Text>
                {byline ? <Text style={[typeScale.caption, { color: theme.secondary }]}>{byline}</Text> : null}
              </View>
              <SelectionBadge selected={selected} />
            </View>
            <Text style={[typeScale.caption, { color: theme.secondary }]}>{set.description}</Text>
            <View style={styles.grid}>
              {set.slots.map((slot, i) => (
                <View key={i} style={styles.slot}>
                  <View>
                    <SceneThumb scene={sceneFor(slot.label)} style={styles.thumb} />
                    <View style={[styles.mBadge, { backgroundColor: theme.scrim }]}>
                      <Text style={[typeScale.captionStrong, { color: photoLabel }]}>{`M${i + 1}`}</Text>
                    </View>
                  </View>
                  <Text style={[typeScale.caption, { color: theme.secondary }]}>{slot.label}</Text>
                </View>
              ))}
            </View>
          </Reanimated.View>
        </Pressable>
        {selected ? children : null}
      </Card>
    </View>
  );
}

/** Filled accent with a check when selected; an outlined empty circle otherwise. */
function SelectionBadge({ selected }: { selected: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        selected ? { backgroundColor: theme.prime } : { backgroundColor: theme.fill, borderWidth: 2, borderColor: theme.outline },
      ]}
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      {selected ? <CheckIcon color={theme.onPrime} size={18} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderRadius: radii.card, borderWidth: 2 },
  body: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  titles: { flex: 1, minWidth: 0 },
  badge: { width: 32, height: 32, borderRadius: 16, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", gap: spacing.sm },
  slot: { flex: 1, minWidth: 0, gap: spacing.xs },
  thumb: { aspectRatio: 1, borderRadius: radii.field },
  mBadge: { position: "absolute", left: spacing.sm, top: spacing.sm, borderRadius: radii.badge, paddingHorizontal: spacing.sm },
});
