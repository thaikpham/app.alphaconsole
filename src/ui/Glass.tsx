import {
  GlassContainer as NativeGlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { BlurView } from "expo-blur";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useIsDark, useTheme } from "./theme";
import { durations, glass, spacing as tokenSpacing } from "./tokens";
import { useReduceMotion } from "./useReduceMotion";
import { useReduceTransparency } from "./useReduceTransparency";

export type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Press feedback on the native glass. */
  interactive?: boolean;
  /** Brightness behind the glass, 0 (dark) to 1 (bright). Sets the darkening on Android 12+ and web. Default 0.5. */
  luminance?: number;
  /** Press glow (0 to 1) inside the glass block. Native glass has its own press feedback. Off under Reduce Motion. */
  glow?: Animated.Value;
};

export type GlassContainerProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Distance at which neighbouring glass shapes merge. Default `spacing.toolbarGroup`. */
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
// Real blur needs Android 12 (API 31). Below that expo-blur draws no blur, so Android keeps the translucent tint.
const androidBlur = Platform.OS === "android" && typeof Platform.Version === "number" && Platform.Version >= 31;
/** expo-blur intensity, 1 to 100. Gap: the glass token `blur` is a radius on another scale. */
const BLUR_INTENSITY = 60;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Glass for the navigation and floating layers (L1). iOS 26+ uses the native GlassView and leaves its opacity to the
 * system. Android 12+ blurs the scroll area under the glass. Other platforms get the material tint. Every non-native
 * surface gets the Contour rim (L4). Reduce Transparency gets a solid fill with a hairline (L6).
 */
export function Glass({ children, style, interactive = false, luminance = 0.5, glow }: GlassProps) {
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();
  const reduceMotion = useReduceMotion();
  const blurSource = useContext(BlurSourceContext);
  const dark = useIsDark();
  const material = dark ? glass.regular.dark : glass.regular.light;

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
      <View
        style={[
          styles.surface,
          { backgroundColor: theme.card, borderColor: material.hairline },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <Material
      blurSource={androidBlur ? blurSource : null}
      dark={dark}
      luminance={luminance}
      glow={reduceMotion ? undefined : glow}
      style={style}
    >
      {children}
    </Material>
  );
}

type MaterialProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  blurSource: RefObject<ComponentRef<typeof View> | null> | null;
  dark: boolean;
  luminance: number;
  glow?: Animated.Value;
};

/** Non-native glass: optional blur, the material tint, a darkening that follows luminance, the rim, and the press glow. */
function Material({ children, style, blurSource, dark, luminance, glow }: MaterialProps) {
  const material = dark ? glass.regular.dark : glass.regular.light;
  const [shade] = useState(() => new Animated.Value(clamp01(luminance)));

  useEffect(() => {
    Animated.timing(shade, {
      toValue: clamp01(luminance),
      duration: durations.glassTint,
      useNativeDriver: true,
    }).start();
  }, [shade, luminance]);

  return (
    <View style={[styles.surface, styles.rim, { borderColor: material.hairline, borderTopColor: material.rim }, style]}>
      {blurSource ? (
        <BlurView
          blurTarget={blurSource}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={BLUR_INTENSITY}
          tint={dark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: material.tint }]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: material.scrim, opacity: shade }]} />
      {glow ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255, 255, 255, ${glass.pressGlowAlpha})`, opacity: glow }]}
        />
      ) : null}
      {children}
    </View>
  );
}

export function GlassContainer({ children, spacing = tokenSpacing.toolbarGroup, style }: GlassContainerProps) {
  if (!nativeGlass) return <View style={style}>{children}</View>;
  return (
    <NativeGlassContainer spacing={spacing} style={style}>
      {children}
    </NativeGlassContainer>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  // The top edge catches light: a 1 dp rim over the hairline (L4).
  rim: { borderTopWidth: 1 },
});
