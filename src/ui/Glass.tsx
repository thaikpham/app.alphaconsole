import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./theme";
import { photoScrim } from "./tokens";

export type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Surface over a photo. Solid scrim so white labels keep contrast in both schemes (L7). */
  overPhoto?: boolean;
};

/**
 * Flat surface for bars, toolbars, and floating controls. The Android v21 frame has no blur or glass layer: a card fill
 * with a 1 px hairline in `separator`. Over a photo it is a solid scrim. Design: design/v21/SPEC.md §3.1.
 */
export function Glass({ children, style, overPhoto = false }: GlassProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.surface, { backgroundColor: overPhoto ? photoScrim : theme.card, borderColor: theme.separator }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
