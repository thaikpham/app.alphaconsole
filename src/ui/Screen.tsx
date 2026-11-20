import { useRef, type ComponentRef, type ReactNode, type Ref } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { BlurTargetView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurSourceContext } from "./Glass";
import { spacing, useTheme } from "./theme";

/**
 * Page background is `edge`, scroll area is `bg`.
 * With a footer, the bottom inset moves into PinnedBar so the glass bar reaches the bottom edge.
 * `nativeHeader` (default true: every route sets a native Stack header) skips the top inset, since the header already clears the status bar.
 * The scroll area is the blur source for footer glass on Android.
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
  const scrollArea = useRef<ComponentRef<typeof View>>(null);
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
      <BlurTargetView ref={scrollArea} style={styles.area}>
        <ScrollView ref={scrollRef} style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      </BlurTargetView>
      <BlurSourceContext.Provider value={scrollArea}>
        {footer}
        {overlay}
      </BlurSourceContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  area: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
