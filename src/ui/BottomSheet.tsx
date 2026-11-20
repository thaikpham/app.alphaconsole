import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { content } from "@/content";
import { detentHeight, type Detent } from "./detent";
import { Glass, ModalScope } from "./Glass";
import { radii, typeScale } from "./tokens";
import { motion, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

// Sheet exit is 240 ms ease-in (SPEC-IOS §1.5). Enter is the sheet spring.
const EXIT_MS = 240;
const EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
// Design sheet radii (AlphaIOS.dc.html): top 38 on every sheet. A floating medium sheet also rounds its bottom at 47.
// The theme's radii.sheet (24) is not used, so the sheet matches the design.
const SHEET_RADIUS = 38;
const FLOAT_RADIUS = 47;
const FLOAT_INSET = 8;

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Sheet height (SPEC-IOS §6, O6). Defaults to medium. */
  detent?: Detent;
  /** Header content on the leading side. */
  leading?: ReactNode;
  /** Header content on the trailing side. Replaces the close button when given. */
  trailing?: ReactNode;
};

/**
 * Solid sheet in a Modal with a grabber, spring enter and 240 ms exit (SPEC-IOS §4, §6, O3, O6, O8).
 * Scrim tap, the close button and Android back call onClose. The parent sets visible to false,
 * then the sheet slides out and unmounts, so its children start fresh on every open.
 */
export function BottomSheet({ visible, title, onClose, children, detent = "medium", leading, trailing }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(visible);
  const [enter] = useState(() => new Animated.Value(0));
  const height = detentHeight(detent, windowHeight, insets.top);
  // Medium floats inset from the edges with all four corners rounded. Large is flush to the bottom.
  const floating = detent === "medium";
  // Slide-in starts fully below the screen, including the float inset.
  const slide = floating ? height + FLOAT_INSET : height;

  // Mount as soon as it opens. Setting state during render avoids a frame with the old state.
  if (visible && !shown) setShown(true);

  // When closed, slide out, then unmount.
  useEffect(() => {
    if (visible || !shown) return;
    const exit = Animated.timing(enter, {
      toValue: 0,
      duration: reduce ? 0 : EXIT_MS,
      easing: EXIT_EASING,
      useNativeDriver: true,
    });
    exit.start(({ finished }) => {
      if (finished) setShown(false);
    });
    return () => exit.stop();
  }, [visible, shown, enter, reduce]);

  useEffect(() => {
    if (!visible || !shown) return;
    if (reduce) {
      enter.setValue(1);
      return;
    }
    const open = Animated.spring(enter, { toValue: 1, ...motion.spring.sheet, useNativeDriver: true });
    open.start();
    return () => open.stop();
  }, [visible, shown, enter, reduce]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [slide, 0] });
  // The spring overshoots past 1. Clamp the scrim so it never gets brighter than its resting value.
  const scrimOpacity = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <Modal visible={shown} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <ModalScope>
        <KeyboardAvoidingView behavior="padding" style={styles.root}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim, opacity: scrimOpacity }]} />
          <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
          <Animated.View
            style={[
              styles.sheet,
              floating ? styles.floating : null,
              { height, backgroundColor: theme.sheet, paddingBottom: insets.bottom, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.grabberBox}>
              <View style={[styles.grabber, { backgroundColor: theme.fill2 }]} />
            </View>
            <View style={styles.header}>
              <View style={styles.side}>{leading}</View>
              <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.label }]}>
                {title}
              </Text>
              <View style={[styles.side, styles.sideEnd]}>{trailing ?? <CloseButton onPress={onClose} />}</View>
            </View>
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </ModalScope>
    </Modal>
  );
}

export type HeaderActionProps = {
  label: string;
  onPress: () => void;
  /** Filled capsule (Tạo). Otherwise accent text (Xong, Hủy). */
  primary?: boolean;
  disabled?: boolean;
};

/** Action for the `leading` and `trailing` header slots. */
export function HeaderAction({ label, onPress, primary = false, disabled = false }: HeaderActionProps) {
  const theme = useTheme();
  if (primary) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.capsule,
          { backgroundColor: disabled ? theme.disabled : theme.prime },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[typeScale.button, { color: theme.onPrime }]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textHit, pressed && styles.pressed]}
    >
      <Text style={[typeScale.button, { color: disabled ? theme.disabled : theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={content.common.close} onPress={onPress} style={styles.closeHit}>
      <Glass onSheet interactive style={styles.closeGlass}>
        <Text style={[styles.closeIcon, { color: theme.label }]}>×</Text>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    // Keyboard padding shrinks the root, so the sheet shrinks with it instead of running off the top.
    maxHeight: "100%",
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: "hidden",
  },
  floating: {
    marginHorizontal: FLOAT_INSET,
    marginBottom: FLOAT_INSET,
    borderBottomLeftRadius: FLOAT_RADIUS,
    borderBottomRightRadius: FLOAT_RADIUS,
  },
  grabberBox: { height: 20, paddingTop: 7, alignItems: "center" },
  grabber: { width: 36, height: 5, borderRadius: 3 },
  header: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingHorizontal: spacing.lg },
  side: { flex: 1, minWidth: 44, alignItems: "flex-start" },
  sideEnd: { alignItems: "flex-end" },
  title: { ...typeScale.headline, flex: 2, textAlign: "center" },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  closeHit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeGlass: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  closeIcon: { ...typeScale.headline },
  textHit: { minHeight: 44, justifyContent: "center" },
  capsule: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
