import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Reanimated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { content } from "@/content";
import { detentHeight, type Detent } from "./detent";
import { Glass, ModalScope } from "./Glass";
import { haptic } from "./haptics";
import { exitEasing, springs, usePressScale } from "./motion";
import { CrossIcon } from "./StatusIcons";
import { durations, gesture, radii, typeScale } from "./tokens";
import { spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

// A medium (floating) sheet is inset from the left, right and bottom edges. Both detents round at radii.sheet.
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
 * Solid sheet in a Modal with a grabber. Drag the grabber or header down and the sheet follows the finger. Release carries the
 * velocity into a spring: past half the sheet height it dismisses, otherwise it springs back to the detent with a rigid haptic.
 * Enter is the sheet spring. Exit is durations.short on the exit curve. Reduce Motion fades in place and turns the drag off.
 * Scrim tap, the close button and Android back call onClose. The parent sets visible to false,
 * then the sheet slides out and unmounts, so its children start fresh on every open.
 */
export function BottomSheet({ visible, title, onClose, children, detent = "medium", leading, trailing }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(visible);
  const height = detentHeight(detent, windowHeight, insets.top);
  // Medium floats inset from the edges. Large is flush to the bottom.
  const floating = detent === "medium";
  // Slide-in starts fully below the screen, including the float inset.
  const slide = floating ? height + FLOAT_INSET : height;
  // Share of the window the sheet covers. The scrim darkens with it, so a full-height sheet sits on a more opaque scrim.
  const coverage = windowHeight > 0 ? Math.min(1, height / windowHeight) : 0;

  // Points below the detent: 0 at rest, `slide` off screen.
  const offset = useSharedValue(slide);
  // Sheet and scrim opacity. Reduce Motion uses it in place of the slide.
  const fade = useSharedValue(1);
  // Offset where the current drag began.
  const dragFrom = useSharedValue(0);

  // Mount as soon as it opens. Setting state during render avoids a frame with the old state.
  if (visible && !shown) setShown(true);

  const hide = useCallback(() => setShown(false), []);

  // Opens: slide up on the sheet spring, or fade in place under Reduce Motion.
  useEffect(() => {
    if (!visible || !shown) return;
    if (reduce) {
      offset.set(0);
      fade.set(0);
      fade.set(withTiming(1, { duration: durations.short }));
      return;
    }
    fade.set(1);
    offset.set(slide);
    offset.set(withSpring(0, springs.sheet));
  }, [visible, shown, reduce, slide, offset, fade]);

  // Closes: slide out on the exit curve, or fade out under Reduce Motion. Unmounts when the animation finishes.
  useEffect(() => {
    if (visible || !shown) return;
    const done = (finished?: boolean) => {
      "worklet";
      if (finished) scheduleOnRN(hide);
    };
    if (reduce) fade.set(withTiming(0, { duration: durations.short }, done));
    else offset.set(withTiming(slide, { duration: durations.short, easing: exitEasing }, done));
    return () => {
      cancelAnimation(offset);
      cancelAnimation(fade);
    };
  }, [visible, shown, reduce, slide, offset, fade, hide]);

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!reduce)
        .activeOffsetY(gesture.dragSlopPx)
        .onStart(() => {
          dragFrom.set(offset.get());
        })
        .onUpdate((event) => {
          offset.set(Math.min(slide, Math.max(0, dragFrom.get() + event.translationY)));
        })
        .onEnd((event) => {
          const landing = offset.get() + event.velocityY * gesture.flingProjectionS;
          if (landing > height / 2) {
            offset.set(
              withSpring(slide, { ...springs.snappy, velocity: event.velocityY }, (finished) => {
                "worklet";
                if (finished) scheduleOnRN(onClose);
              }),
            );
            return;
          }
          offset.set(withSpring(0, { ...springs.bouncy, velocity: event.velocityY }));
          scheduleOnRN(haptic, "impactRigid");
        }),
    [dragFrom, height, offset, onClose, reduce, slide],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: offset.get() }],
  }));

  // The spring overshoots past rest. The clamp keeps the scrim from getting brighter than its resting value.
  const scrimStyle = useAnimatedStyle(() => {
    const open = slide > 0 ? Math.min(1, Math.max(0, 1 - offset.get() / slide)) : 0;
    return { opacity: fade.get() * open * coverage };
  }, [slide, coverage]);

  return (
    <Modal visible={shown} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <ModalScope>
        <GestureHandlerRootView style={styles.fill}>
          <KeyboardAvoidingView behavior="padding" style={styles.root}>
            <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, scrimStyle]} />
            <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
            <Reanimated.View
              style={[
                styles.sheet,
                floating ? styles.floating : null,
                { height, backgroundColor: theme.sheet, paddingBottom: insets.bottom },
                sheetStyle,
              ]}
            >
              <GestureDetector gesture={drag}>
                <View>
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
                </View>
              </GestureDetector>
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            </Reanimated.View>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
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

/** Action for the `leading` and `trailing` header slots. Presses to `press.button` on the button spring (M6). */
export function HeaderAction({ label, onPress, primary = false, disabled = false }: HeaderActionProps) {
  const theme = useTheme();
  const pressScale = usePressScale("button");
  if (primary) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressScale.onPressIn}
        onPressOut={pressScale.onPressOut}
      >
        <Reanimated.View
          style={[styles.capsule, { backgroundColor: disabled ? theme.disabled : theme.prime }, pressScale.style]}
        >
          <Text style={[typeScale.button, { color: theme.onPrime }]}>{label}</Text>
        </Reanimated.View>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
    >
      <Reanimated.View style={[styles.textHit, pressScale.style]}>
        <Text style={[typeScale.button, { color: disabled ? theme.disabled : theme.accentText }]}>{label}</Text>
      </Reanimated.View>
    </Pressable>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={content.common.close} onPress={onPress} style={styles.closeHit}>
      <Glass interactive style={styles.closeGlass}>
        <CrossIcon color={theme.label} size={14} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    // Keyboard padding shrinks the root, so the sheet shrinks with it instead of running off the top.
    maxHeight: "100%",
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: "hidden",
  },
  floating: {
    marginHorizontal: FLOAT_INSET,
    marginBottom: FLOAT_INSET,
    borderBottomLeftRadius: radii.sheet,
    borderBottomRightRadius: radii.sheet,
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
  textHit: { minHeight: 44, justifyContent: "center" },
  capsule: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
