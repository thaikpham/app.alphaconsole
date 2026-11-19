import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing, useTheme } from "./theme";

/** Bar for Screen's `footer` prop: pinned below the scroll area, above the bottom inset. */
export function PinnedBar({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.separator }]}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
