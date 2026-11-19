import type { ReactNode, Ref } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "./theme.ios";

/**
 * Same contract as Screen.tsx. Page background is `edge`, scroll area is `bg`.
 * With a footer, the bottom inset moves into PinnedBar.ios so the glass bar reaches the bottom edge.
 * `nativeHeader` (default true: every iOS route sets a native Stack header) skips the top inset, since the header already clears the status bar.
 */
export function Screen({
  children,
  footer,
  scrollRef,
  overlay,
  nativeHeader = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scrollRef?: Ref<ScrollViewInstance>;
  overlay?: ReactNode;
  nativeHeader?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View
      style={[
        styles.safe,
        {
          backgroundColor: theme.edge,
          paddingTop: nativeHeader ? 0 : insets.top,
          paddingBottom: footer ? 0 : insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView ref={scrollRef} style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
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
