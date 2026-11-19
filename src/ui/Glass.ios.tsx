import {
  GlassContainer as NativeGlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import type { ReactNode } from "react";
import { StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from "react-native";
import { glass, useTheme } from "./theme.ios";
import { useReduceTransparency } from "./useReduceTransparency";

export type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Press feedback on the native glass. */
  interactive?: boolean;
  /** Glass sits on a sheet, so the solid fallback uses `cell`. */
  onSheet?: boolean;
  /** Glass sits over a photo, so the fallback darkens more. */
  onImage?: boolean;
};

export type GlassContainerProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Distance at which neighbouring glass shapes merge. */
  spacing?: number;
};

// Both checks guard against a GlassView crash on some iOS 26 betas (expo issue 40911).
const nativeGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** Liquid Glass on iOS 26+. Older systems and Reduce Transparency get a translucent or solid View with the same look. */
export function Glass({ children, style, interactive = false, onSheet = false, onImage = false }: GlassProps) {
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();
  const dark = useColorScheme() === "dark";

  if (nativeGlass && !reduceTransparency) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        colorScheme={dark ? "dark" : "light"}
        style={style}
      >
        {children}
      </GlassView>
    );
  }

  if (reduceTransparency) {
    return (
      <View style={[styles.fallback, { backgroundColor: onSheet ? theme.cell : theme.card }, style]}>{children}</View>
    );
  }

  const gk = onImage ? glass.gk.onImage : dark ? glass.gk.dark : glass.gk.mid;
  return (
    <View style={[styles.fallback, { backgroundColor: `rgba(255, 255, 255, ${glass.gt})` }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0, 0, 0, ${gk})` }]} />
      <View style={[StyleSheet.absoluteFill, styles.highlight]} />
      {children}
    </View>
  );
}

export function GlassContainer({ children, spacing, style }: GlassContainerProps) {
  if (!nativeGlass) return <View style={style}>{children}</View>;
  return (
    <NativeGlassContainer spacing={spacing} style={style}>
      {children}
    </NativeGlassContainer>
  );
}

const styles = StyleSheet.create({
  fallback: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  highlight: {
    experimental_backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, ${glass.highlightTop}), rgba(255, 255, 255, 0))`,
  },
});
