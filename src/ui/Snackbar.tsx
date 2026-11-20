import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { animatedSpring, usePressScale } from "./motion";
import { distance, timing, typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

export type SnackbarAction = { label: string; onPress: () => void };
export type SnackbarState = { id: number; message: string; action?: SnackbarAction };

/** Holds the current snackbar. It hides after `timing.snackbarPlainMs`, or `timing.snackbarActionMs` when it has an action. */
export function useSnackbar() {
  const [state, setState] = useState<SnackbarState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextId = useRef(0);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setState(null);
  }, []);

  const show = useCallback(
    (message: string, action?: SnackbarAction) => {
      clearTimeout(timer.current);
      nextId.current += 1;
      setState({ id: nextId.current, message, action });
      timer.current = setTimeout(hide, action ? timing.snackbarActionMs : timing.snackbarPlainMs);
    },
    [hide],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { state, show, hide };
}

/** Place in Screen's `overlay` prop. Renders nothing while `state` is null. */
export function Snackbar({ state, onDismiss }: { state: SnackbarState | null; onDismiss: () => void }) {
  if (!state) return null;
  return <SnackbarBar key={state.id} message={state.message} action={state.action} onDismiss={onDismiss} />;
}

/** Android toast (SPEC §3.1): inverse fill, 16/24 text, radius 14, min height 48, elevation 6. Enters by a transform-only spring. */
function SnackbarBar({ message, action, onDismiss }: { message: string; action?: SnackbarAction; onDismiss: () => void }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      enter.setValue(1);
      return;
    }
    animatedSpring(enter, 1, "smooth").start();
  }, [enter, reduce]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          bottom: 100 + insets.bottom,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [distance.snackbarEnterPx, 0] }) }],
        },
      ]}
    >
      <View style={[styles.surface, { backgroundColor: theme.inverse }]}>
        <Text style={[styles.message, { color: theme.onInverse }]}>{message}</Text>
        {action ? <SnackbarActionButton action={action} onDismiss={onDismiss} /> : null}
      </View>
    </Animated.View>
  );
}

/** Action label. Presses in and out on the button spring (M6). */
function SnackbarActionButton({ action, onDismiss }: { action: SnackbarAction; onDismiss: () => void }) {
  const theme = useTheme();
  const pressScale = usePressScale("button");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        action.onPress();
        onDismiss();
      }}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
    >
      <Reanimated.View style={[styles.action, pressScale.style]}>
        <Text style={[styles.actionLabel, { color: theme.inverseAccent }]}>{action.label}</Text>
      </Reanimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  surface: {
    minHeight: controlHeight,
    borderRadius: radii.toast,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    elevation: 6,
  },
  message: { ...typeScale.callout, flex: 1 },
  action: {
    minHeight: controlHeight,
    minWidth: controlHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionLabel: { ...typeScale.button },
});
