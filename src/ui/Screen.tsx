import { useCallback, useRef, useState, type ReactNode, type Ref } from "react";
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollEdge } from "./ScrollEdge";
import { spacing, useTheme } from "./theme";

/**
 * Page background is `edge`, scroll area is `bg`.
 * With a footer, the bottom inset moves into PinnedBar so the bar reaches the bottom edge.
 * `nativeHeader` (default true: every route sets a native Stack header) skips the top inset, since the header already clears the status bar.
 * `scrollEdge` fades scrolled content under the top bar. It tracks scroll only when on, and re-renders only when content crosses the top.
 */
export function Screen({
  children,
  top,
  footer,
  scrollRef,
  overlay,
  nativeHeader = true,
  scrollEdge = false,
  center = false,
}: {
  children: ReactNode;
  /** Fixed block between the top bar and the scroll area (for example the slot and stage pickers of Chỉnh slot). */
  top?: ReactNode;
  footer?: ReactNode;
  scrollRef?: Ref<ScrollViewInstance>;
  overlay?: ReactNode;
  nativeHeader?: boolean;
  scrollEdge?: boolean;
  /** Centre the content in the scroll area (AlphaApp screen 4: padding 24 16, 20 px gaps). */
  center?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > 0;
    if (next === scrolledRef.current) return;
    scrolledRef.current = next;
    setScrolled(next);
  }, []);
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
      {top ? <View style={[styles.top, { backgroundColor: theme.bg }]}>{top}</View> : null}
      <View style={styles.area}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: theme.bg }}
          contentContainerStyle={center ? styles.centered : styles.content}
          onScroll={scrollEdge ? onScroll : undefined}
          scrollEventThrottle={scrollEdge ? 16 : undefined}
        >
          {children}
        </ScrollView>
      </View>
      {scrollEdge ? <ScrollEdge edge="top" scrolled={scrolled} /> : null}
      {footer}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // AlphaApp screen 2: padding 0 16 4, 4 px between the slot segment and the stage tabs.
  centered: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.xl },
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, gap: spacing.xs },
  area: { flex: 1 },
  // v21 scroll area (AlphaApp `.acl-sc`): 4 px under the top bar, 16 px sides, 24 px at the end, 16 px between blocks.
  content: { paddingTop: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
});
