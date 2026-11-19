import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glass } from "./Glass";
import { typeScale } from "./tokens.ios";
import { controlHeight, motion, radii, spacing, useTheme } from "./theme.ios";
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

/** Glass capsule above the bottom bar. Enters by a transform-only push spring; no opacity on glass. */
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
    Animated.spring(enter, { toValue: 1, ...motion.spring.push, useNativeDriver: true }).start();
  }, [enter, reduce]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          bottom: 100 + insets.bottom,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <Glass style={styles.surface}>
        <Text style={[styles.message, { color: theme.label }]}>{message}</Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              action.onPress();
              onDismiss();
            }}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={[styles.actionLabel, { color: theme.accent }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </Glass>
    </Animated.View>
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
  pressed: { transform: [{ scale: 0.96 }] },
});
