import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Reanimated from "react-native-reanimated";
import { usePressScale } from "./motion";
import { Glass, GlassContainer } from "./Glass";
import { controlHeight, radii, spacing } from "./tokens";

type ChildrenProps = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/** Toolbar row (L3). All groups sit in one GlassContainer, so neighbouring capsules share the `toolbarGroup` spacing. */
export function GlassToolbar({ children, style }: ChildrenProps) {
  return <GlassContainer style={[styles.row, style]}>{children}</GlassContainer>;
}

/** One capsule of related buttons (L3, R2). Keep one kind of content per group: icons only, or text only. `luminance` 1 over a photo. */
export function GlassToolbarGroup({ children, style, luminance }: ChildrenProps & { luminance?: number }) {
  return (
    <Glass luminance={luminance} style={[styles.group, style]}>
      {children}
    </Glass>
  );
}

export type GlassToolbarButtonProps = {
  /** Required: icon-only buttons need a label for screen readers (L3). */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
};

/** Button inside a toolbar group. Presses to `press.button` (M6). Hit area: 48 dp on Android (P2), 44 pt on iOS. */
export function GlassToolbarButton({ accessibilityLabel, onPress, disabled = false, children }: GlassToolbarButtonProps) {
  const { style, onPressIn, onPressOut } = usePressScale("button");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Reanimated.View style={[styles.button, disabled && styles.disabled, style]}>{children}</Reanimated.View>
    </Pressable>
  );
}

/** Stretch space that pushes toolbar groups to both sides (L3). `fixed` gives a `toolbarGroup`-wide gap instead. */
export function ToolbarSpacer({ fixed = false }: { fixed?: boolean }) {
  return <View style={fixed ? styles.fixed : styles.grow} />;
}

const touchTarget = Platform.OS === "android" ? 48 : 44;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.toolbarGroup },
  group: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: controlHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
  },
  button: { minWidth: touchTarget, minHeight: touchTarget, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  grow: { flexGrow: 1 },
  fixed: { width: spacing.toolbarGroup },
});
