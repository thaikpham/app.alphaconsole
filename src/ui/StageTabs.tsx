import { Pressable, StyleSheet, Text, View } from "react-native";
import { haptic } from "./haptics";
import { typeScale } from "./tokens";
import { spacing, useTheme } from "./theme";
import { fontFamily } from "./v21";

type Props = {
  stages: readonly string[];
  /** 0-based index of the active stage. */
  current: number;
  onSelect: (index: number) => void;
};

/**
 * Stage tabs of Chỉnh slot (AlphaApp screen 2): 48 px tall, the name over a 3 px bar. Bars up to the active stage are
 * accent, the rest hairline; the active name is bold in the text colour.
 */
export function StageTabs({ stages, current, onSelect }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {stages.map((name, i) => {
        const active = i === current;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) haptic("selection");
              onSelect(i);
            }}
            style={styles.tab}
          >
            <Text
              numberOfLines={1}
              style={[styles.name, { color: active ? theme.label : theme.secondary, fontFamily: active ? fontFamily.bold : fontFamily.medium }]}
            >
              {name}
            </Text>
            <View style={[styles.bar, { backgroundColor: i <= current ? theme.accent : theme.separator }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  tab: { flexGrow: 1, flexShrink: 1, minWidth: 0, height: 48, paddingHorizontal: spacing.xs, justifyContent: "center", gap: spacing.s6 },
  name: { ...typeScale.subhead, textAlign: "center" },
  bar: { height: 3, borderRadius: 2 },
});
