import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { typeScale } from "./tokens";
import { radii, spacing, useTheme, type Palette } from "./theme";

type Props = {
  stages: readonly string[];
  /** 0-based index of the active stage. Earlier stages show as done. */
  current: number;
  /** marked[i] true puts a small dot on stage i (for example, a stage that has changes). */
  marked?: readonly boolean[];
  /** Makes each stage a tab that calls onSelect with its index. Without it the stages are display only. */
  onSelect?: (index: number) => void;
};

type DotState = "active" | "done" | "idle";

function stateOf(index: number, current: number): DotState {
  if (index === current) return "active";
  return index < current ? "done" : "idle";
}

// Active is an accent ring on card, not an accent fill: the solid fill is the primary capsule's, and a dark accent fill would read as a button.
function dotPaint(state: DotState, theme: Palette): ViewStyle {
  if (state === "active") return { backgroundColor: theme.card, borderWidth: 2, borderColor: theme.accentText };
  if (state === "done") return { backgroundColor: theme.separator };
  return { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.separator };
}

export function StageStepper({ stages, current, marked, onSelect }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {stages.map((name, i) => {
        const state = stateOf(i, current);
        const active = state === "active";
        return (
          <Pressable
            key={name}
            accessible={onSelect !== undefined}
            accessibilityRole={onSelect ? "tab" : undefined}
            accessibilityState={onSelect ? { selected: active } : undefined}
            onPress={onSelect ? () => onSelect(i) : undefined}
            style={styles.step}
          >
            <View style={[styles.dot, dotPaint(state, theme)]}>
              <Text style={[styles.dotText, { color: active ? theme.accentText : theme.secondary }]}>{i + 1}</Text>
              {marked?.[i] ? <View style={[styles.mark, { backgroundColor: theme.success, borderColor: theme.card }]} /> : null}
            </View>
            <Text style={[styles.name, { color: active ? theme.label : theme.secondary }]}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  step: { flex: 1, alignItems: "center", gap: spacing.xs },
  dot: { width: 28, height: 28, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  mark: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  dotText: { ...typeScale.fieldLabel },
  name: { ...typeScale.subhead, textAlign: "center" },
});
