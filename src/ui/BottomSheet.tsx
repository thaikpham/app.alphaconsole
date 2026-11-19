import { useEffect, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { content } from "@/content";
import type { Detent } from "./detent";
import { typeScale } from "./tokens";
import { controlHeight, motion, radii, spacing, useTheme } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** iOS only. Android ignores it and keeps its own height. */
  detent?: Detent;
  /** iOS only. Android does not render header slots. */
  leading?: ReactNode;
  /** iOS only. Android does not render header slots. */
  trailing?: ReactNode;
};

/**
 * Sheet in a Modal. Closes on scrim tap, the close button, or Android back.
 * Status and navigation bars are translucent so the scrim covers the whole screen.
 */
export function BottomSheet({ visible, title, onClose, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [height, setHeight] = useState(0);
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) enter.setValue(0);
  }, [visible, enter]);

  useEffect(() => {
    if (!visible || height === 0) return;
    Animated.timing(enter, {
      toValue: 1,
      duration: reduce ? 0 : motion.emphasized.duration,
      easing: motion.emphasized.easing,
      useNativeDriver: true,
    }).start();
  }, [visible, height, reduce, enter]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable accessible={false} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} />
        <Animated.View
          onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              paddingBottom: spacing.xl + insets.bottom,
              opacity: height ? 1 : 0,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.outline }]} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.label }]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={content.common.close}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={[styles.closeIcon, { color: theme.secondary }]}>×</Text>
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export type HeaderActionProps = {
  label: string;
  onPress: () => void;
  /** Filled capsule. Otherwise accent text. */
  primary?: boolean;
  disabled?: boolean;
};

/** Action for the `leading` and `trailing` header slots. Android does not render those slots. This keeps shared imports type-checking. */
export function HeaderAction({ label, onPress, primary = false, disabled = false }: HeaderActionProps) {
  const theme = useTheme();
  const tint = disabled ? theme.disabled : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && { backgroundColor: tint, paddingHorizontal: spacing.lg, borderRadius: radii.pill },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[typeScale.button, { color: primary ? theme.onAccent : tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typeScale.title2, flex: 1 },
  close: {
    width: controlHeight,
    height: controlHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  closeIcon: { ...typeScale.title2 },
  action: { minHeight: 44, justifyContent: "center" },
  pressed: { opacity: 0.6 },
});
