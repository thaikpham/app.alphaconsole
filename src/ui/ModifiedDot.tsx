import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./theme";

/**
 * 6px dot that marks a changed item. Uses `accent`: #c2410c on light, #ff8a3d on dark (icon use).
 * Decorative: pair it with text.
 */
export function ModifiedDot({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.dot, { backgroundColor: theme.accent }, style]} />;
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3 },
});
