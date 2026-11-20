// One set on the preset home (SPEC-IOS §4.4). Card surface, scene strip, and a 2 px accent ring when selected.
// The actions (children) show only while the card is selected.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";

import type { PresetSet } from "@/core/web/lib/presetSets";
import { sceneFor } from "@/home/sceneMap";
import { Card } from "@/ui/Card";
import { usePressScale } from "@/ui/motion";
import { SceneThumb } from "@/ui/SceneThumb";
import { typeScale } from "@/ui/tokens";
import { radii, spacing, useTheme } from "@/ui/theme";

type Props = {
  set: PresetSet;
  /** Line under the name (author or origin). Omitted when there is none. */
  byline?: string;
  selected: boolean;
  onPress: () => void;
  children?: ReactNode;
};

/** The ring is a 2 px border that is transparent when unselected, so the layout does not shift. Press is scale, never opacity. */
export function PresetCard({ set, byline, selected, onPress, children }: Props) {
  const theme = useTheme();
  const pressScale = usePressScale("card");
  return (
    <View style={[styles.ring, { borderColor: selected ? theme.accentText : "transparent" }]}>
      <Card>
        <Pressable
          onPress={onPress}
          onPressIn={pressScale.onPressIn}
          onPressOut={pressScale.onPressOut}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
        >
          <Reanimated.View style={[styles.body, pressScale.style]}>
            <Text style={[typeScale.title3, { color: theme.label }]}>{set.name}</Text>
            {byline ? <Text style={[typeScale.subhead, { color: theme.secondary }]}>{byline}</Text> : null}
            <Text style={[typeScale.subhead, { color: theme.secondary }]}>{set.description}</Text>
            <View style={styles.scenes}>
              {set.slots.map((slot, i) => (
                <SceneThumb key={i} scene={sceneFor(slot.label)} style={styles.scene} />
              ))}
            </View>
            <Text style={[typeScale.subhead, { color: theme.label }]}>
              {set.slots.map((slot) => slot.label).join(" · ")}
            </Text>
          </Reanimated.View>
        </Pressable>
        {selected ? children : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderRadius: radii.card, borderWidth: 2 },
  body: { gap: spacing.sm },
  scenes: { flexDirection: "row", gap: spacing.xs },
  scene: { flex: 1 },
});
