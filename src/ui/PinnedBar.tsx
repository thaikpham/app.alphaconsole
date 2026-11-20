import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "./theme";

/** Bar for Screen's `footer` prop. Card surface with a top hairline (SPEC §2.4.2 footer), padded above the bottom inset. */
export function PinnedBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.separator, paddingBottom: spacing.md + insets.bottom }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
});
