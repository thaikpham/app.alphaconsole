import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { typeScale } from "./tokens";
import { controlHeight, motion, radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

export type SnackbarAction = { label: string; onPress: () => void };
export type SnackbarState = { id: number; message: string; action?: SnackbarAction };

const PLAIN_MS = 2400;
const ACTION_MS = 4000;

/** Holds the current snackbar. It hides after 2400 ms, or 4000 ms when it has an action. */
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
      timer.current = setTimeout(hide, action ? ACTION_MS : PLAIN_MS);
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

function SnackbarBar({ message, action, onDismiss }: { message: string; action?: SnackbarAction; onDismiss: () => void }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: reduce ? 0 : motion.standard.duration,
      easing: motion.standard.easing,
      useNativeDriver: true,
    }).start();
  }, [enter, reduce]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          backgroundColor: theme.inverse,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.message, { color: theme.onInverse }]}>{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            action.onPress();
            onDismiss();
          }}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={[styles.actionLabel, { color: theme.inverseAccent }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 100,
    minHeight: controlHeight,
    borderRadius: radii.control,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  message: { ...typeScale.subhead, flex: 1 },
  action: {
    minHeight: controlHeight,
    minWidth: controlHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionLabel: { ...typeScale.button },
  pressed: { opacity: 0.6 },
});
