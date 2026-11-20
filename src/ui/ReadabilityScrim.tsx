import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { glass } from "./tokens";

/** Dark fade under text set directly on a photo (L8): black at the bottom, clear above. Render it over the image, under the text. */
export function ReadabilityScrim({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, style]} />;
}

const styles = StyleSheet.create({
  scrim: {
    experimental_backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, ${glass.readabilityScrimAlpha}), rgba(0, 0, 0, 0))`,
  },
});
