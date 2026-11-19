import type { ReactNode, Ref } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "./theme";

/**
 * Every route renders through this, so the safe-area padding is the same on all screens.
 * `footer` is pinned below the scroll area, above the bottom inset. `overlay` is drawn last, above the footer (for example a Snackbar). `scrollRef` reaches the ScrollView.
 */
export function Screen({
  children,
  footer,
  scrollRef,
  overlay,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scrollRef?: Ref<ScrollViewInstance>;
  overlay?: ReactNode;
  /** iOS only: a native header already clears the status bar. Base ignores it. */
  nativeHeader?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View
      style={[
        styles.safe,
        {
          backgroundColor: theme.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      {footer}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
