import { StyleSheet, View } from "react-native";

// Status glyphs drawn with Views. The app has no icon library, and react-native-svg is not installed. Each mark is
// decorative: the text beside it carries the meaning, so screen readers skip it.

/** Check mark: a right and bottom border turned 45 degrees, so the long arm leans up to the right. */
export function CheckIcon({ color, size = 16 }: { color: string; size?: number }) {
  const stroke = Math.max(2, size / 8);
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.9,
          borderRightWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: color,
          transform: [{ translateY: -size * 0.08 }, { rotate: "45deg" }],
        }}
      />
    </View>
  );
}

/** Close cross: two bars turned 45 and -45 degrees. */
export function CrossIcon({ color, size = 16 }: { color: string; size?: number }) {
  const stroke = Math.max(2, size / 8);
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      {[45, -45].map((angle) => (
        <View
          key={angle}
          style={{
            position: "absolute",
            top: (size - stroke) / 2,
            left: 0,
            width: size,
            height: stroke,
            borderRadius: stroke / 2,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      ))}
    </View>
  );
}

/** Warning mark: a solid triangle, drawn in place of the ▲ glyph. */
export function WarningIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size * 0.9,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: color,
      }}
      importantForAccessibility="no"
      accessibilityElementsHidden
    />
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
