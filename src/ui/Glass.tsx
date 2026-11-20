import {
  GlassContainer as NativeGlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { createContext, useContext, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { glass, useIsDark, useTheme } from "./theme";
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
  /** Press glow (0 to 1) for the non-native fallbacks. Native glass has its own press feedback. */
  glow?: Animated.Value;
};

export type GlassContainerProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Distance at which neighbouring glass shapes merge. */
  spacing?: number;
};

/** The area a glass surface may blur. Screen supplies its scroll area to the footer beside it; scroll content gets none. */
export const BlurSourceContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);

/** A Modal is its own window, so glass inside one cannot sample the screen behind it. Wrap Modal content in this. */
export function ModalScope({ children }: { children: ReactNode }) {
  return <BlurSourceContext.Provider value={null}>{children}</BlurSourceContext.Provider>;
}

// Both checks guard against a GlassView crash on some iOS 26 betas (expo issue 40911).
const nativeGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
// Real blur needs Android 12 (API 31). Below that expo-blur draws no blur, so Android keeps the translucent fallback.
const androidBlur = Platform.OS === "android" && typeof Platform.Version === "number" && Platform.Version >= 31;
const BLUR_INTENSITY = 60;

/**
 * Liquid Glass on iOS 26+. Other platforms get a translucent fill with a brighter top rim. Android 12+ blurs the scroll
 * area under footer glass. Reduce Transparency gets a solid fill.
 */
export function Glass({ children, style, interactive = false, onSheet = false, onImage = false, glow }: GlassProps) {
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();
  const blurSource = useContext(BlurSourceContext);
  const dark = useIsDark();

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

  const glowLayer = glow ? (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { opacity: glow }]} />
  ) : null;
  const highlight = <View style={[StyleSheet.absoluteFill, styles.highlight]} />;

  const frostSource = androidBlur ? blurSource : null;
  if (frostSource) {
    return (
      <View style={[styles.fallback, styles.rim, style]}>
        <BlurView
          blurTarget={frostSource}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={BLUR_INTENSITY}
          tint={dark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255, 255, 255, ${glass.gt})` }]} />
        {highlight}
        {glowLayer}
        {children}
      </View>
    );
  }

  const gk = onImage ? glass.gk.onImage : dark ? glass.gk.dark : glass.gk.mid;
  return (
    <View style={[styles.fallback, styles.rim, { backgroundColor: `rgba(255, 255, 255, ${glass.gt})` }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0, 0, 0, ${gk})` }]} />
      {highlight}
      {glowLayer}
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
  // The top edge catches light: a brighter 1 dp rim over the hairline.
  rim: { borderTopWidth: 1, borderTopColor: glass.rim },
  highlight: {
    experimental_backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, ${glass.highlightTop}), rgba(255, 255, 255, 0))`,
  },
  glow: { backgroundColor: "rgba(255, 255, 255, 0.18)" },
});
