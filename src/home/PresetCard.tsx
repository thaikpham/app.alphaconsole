// One set on the preset home, as AlphaApp screen 1 draws it: a 164 px hero photo with the set name over a dark fade and a
// selection circle, then the four slot photos M1–M4 with their scene names. Selected: 2 px inner outline in the text colour.
import { Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";

import type { PresetSet } from "@/core/web/lib/presetSets";
import { sceneLook } from "@/home/sceneMap";
import { usePressScale } from "@/ui/motion";
import { SceneThumb } from "@/ui/SceneThumb";
import { useTheme } from "@/ui/theme";
import { roles, v21 } from "@/ui/v21";

type Props = {
  set: PresetSet;
  /** Line under the name over the photo (author). Omitted when there is none. */
  byline?: string;
  selected: boolean;
  onPress: () => void;
};

/** Hero slot per design set (AlphaApp HERO); real sets use M1. */
const HERO_SLOT = 0;

/** Press is scale, never opacity. */
export function PresetCard({ set, byline, selected, onPress }: Props) {
  const theme = useTheme();
  const pressScale = usePressScale("card");
  const hero = sceneLook(set.slots[HERO_SLOT]?.label ?? "");
  return (
    <Reanimated.View style={[styles.card, { backgroundColor: theme.card }, pressScale.style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressScale.onPressIn}
        onPressOut={pressScale.onPressOut}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={set.name}
      >
        <View>
          <SceneThumb scene={hero.image} filter={hero.filter} scale={hero.scale} focusY={40} scrim style={styles.hero} />
          <View style={styles.heroText} pointerEvents="none">
            <Text style={[roles.h3, styles.onPhoto]} numberOfLines={2}>
              {set.name}
            </Text>
            {byline ? <Text style={[roles.caption, styles.onPhoto, styles.byline]}>{byline}</Text> : null}
          </View>
          <View style={styles.badge} pointerEvents="none" importantForAccessibility="no" accessibilityElementsHidden>
            <SelectionCircle selected={selected} />
          </View>
        </View>
        <View style={styles.grid}>
          {set.slots.map((slot, i) => {
            const look = sceneLook(slot.label);
            return (
              <View key={i} style={styles.slot}>
                <View>
                  <SceneThumb scene={look.image} filter={look.filter} scale={look.scale} scrim style={styles.thumb} />
                  <Text style={[roles.captionStrong, styles.onPhoto, styles.mLabel]}>{`M${i + 1}`}</Text>
                </View>
                <Text style={[roles.caption, { color: theme.secondary }]}>{slot.label}</Text>
              </View>
            );
          })}
        </View>
      </Pressable>
      {/* Selected outline sits on top (design: outline 2px, offset -2px), so the layout never shifts. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.outline, { borderColor: selected ? theme.label : "transparent" }]}
      />
    </Reanimated.View>
  );
}

/** 32 px circle on the photo: filled #c2410c with a white tick when selected, dark glass ring when not. */
function SelectionCircle({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.circle, { backgroundColor: selected ? v21.primary : "rgba(0, 0, 0, 0.3)" }]}>
      {selected ? <View style={styles.tick} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden" },
  outline: { borderRadius: 24, borderWidth: 2 },
  hero: { height: 164, aspectRatio: undefined, borderRadius: 0 },
  heroText: { position: "absolute", left: 16, right: 16, bottom: 12 },
  onPhoto: {
    color: v21.white,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  byline: { lineHeight: 22, opacity: 0.92 },
  badge: { position: "absolute", left: 12, top: 12 },
  circle: { width: 28, height: 28, margin: 2, borderRadius: 14, borderWidth: 2, borderColor: v21.white, alignItems: "center", justifyContent: "center" },
  // Tick: an L rotated 45°, 2.8 px strokes like the design path.
  tick: {
    width: 7,
    height: 12,
    marginTop: -3,
    borderRightWidth: 2.8,
    borderBottomWidth: 2.8,
    borderColor: v21.white,
    transform: [{ rotate: "45deg" }],
  },
  grid: { flexDirection: "row", gap: 8, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 14 },
  slot: { flex: 1, minWidth: 0, gap: 6 },
  thumb: { aspectRatio: 1, borderRadius: 14 },
  mLabel: { position: "absolute", left: 7, bottom: 5 },
});
