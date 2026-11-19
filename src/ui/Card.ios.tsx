import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { radii, spacing, useTheme } from "./theme.ios";

export function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: "hidden",
  },
});
