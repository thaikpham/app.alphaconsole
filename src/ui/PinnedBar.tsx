import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glass } from "./Glass";
import { spacing } from "./theme";

/** Bar for Screen's `footer` prop. Glass edge surface, padded above the bottom inset. */
export function PinnedBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <Glass style={[styles.bar, { paddingBottom: spacing.lg + insets.bottom }]}>{children}</Glass>;
}

const styles = StyleSheet.create({
  bar: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
