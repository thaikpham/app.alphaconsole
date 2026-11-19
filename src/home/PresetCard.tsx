// One set on the preset home (SPEC 5.1). Its four scenes show the slots. The actions (children) show only while the card is selected.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PresetSet } from "@/core/web/lib/presetSets";
import { sceneFor } from "@/home/sceneMap";
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

export function PresetCard({ set, byline, selected, onPress, children }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: selected ? theme.accentWash : theme.card }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Text style={[typeScale.title3, { color: theme.label }]}>{set.name}</Text>
        {byline ? <Text style={[typeScale.subhead, { color: theme.secondary }]}>{byline}</Text> : null}
        <Text style={[typeScale.subhead, { color: theme.secondary }]}>{set.description}</Text>
        <View style={styles.scenes}>
          {set.slots.map((slot, i) => (
            <SceneThumb key={i} scene={sceneFor(slot.label)} style={styles.scene} />
          ))}
        </View>
        <Text style={[typeScale.subhead, { color: theme.label }]}>{set.slots.map((slot) => slot.label).join(" · ")}</Text>
      </Pressable>
      {selected ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  body: { gap: spacing.sm },
  pressed: { opacity: 0.6 },
  scenes: { flexDirection: "row", gap: spacing.xs },
  scene: { flex: 1 },
});
