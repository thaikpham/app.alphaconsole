import { StyleSheet, Text, View } from "react-native";

import { fontFamily } from "./v21";

// Glyphs drawn with Views, like StatusIcons. The app has no icon library and react-native-svg is not installed.
// Each glyph follows the 24-unit design grid, scaled to `size`, with 2-unit outlines. Decorative: the text beside it carries the meaning.

type GlyphProps = { color: string; size?: number };

const u = (size: number, units: number) => (size * units) / 24;
const outline = (size: number, color: string) => ({ borderWidth: Math.max(1.5, u(size, 2)), borderColor: color });

/** Plus: two bars. */
export function PlusIcon({ color, size = 20 }: GlyphProps) {
  const bar = Math.max(2, size / 8);
  const arm = u(size, 14);
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View style={{ position: "absolute", left: (size - arm) / 2, top: (size - bar) / 2, width: arm, height: bar, borderRadius: bar / 2, backgroundColor: color }} />
      <View style={{ position: "absolute", left: (size - bar) / 2, top: (size - arm) / 2, width: bar, height: arm, borderRadius: bar / 2, backgroundColor: color }} />
    </View>
  );
}

/** Filled chevron pointing down. */
export function ChevronDownIcon({ color, size = 24 }: GlyphProps) {
  const width = u(size, 10);
  const height = u(size, 5);
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: width / 2,
          borderRightWidth: width / 2,
          borderTopWidth: height,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
    </View>
  );
}

/** Camera body with a top bump and a lens. */
export function CameraIcon({ color, size = 24 }: GlyphProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[
          styles.abs,
          outline(size, color),
          { left: u(size, 2), top: u(size, 7), width: u(size, 20), height: u(size, 13), borderRadius: u(size, 2) },
        ]}
      />
      <View
        style={[
          styles.abs,
          outline(size, color),
          {
            borderBottomWidth: 0,
            left: u(size, 8.5),
            top: u(size, 4),
            width: u(size, 7),
            height: u(size, 3.5),
            borderTopLeftRadius: u(size, 2),
            borderTopRightRadius: u(size, 2),
          },
        ]}
      />
      <View
        style={[styles.abs, outline(size, color), { left: u(size, 9), top: u(size, 10), width: u(size, 6), height: u(size, 6), borderRadius: u(size, 3) }]}
      />
    </View>
  );
}

/** Bookmark. The bottom notch is left out at this size. */
export function BookmarkIcon({ color, size = 22 }: GlyphProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[
          styles.abs,
          outline(size, color),
          { left: u(size, 5), top: u(size, 3), width: u(size, 14), height: u(size, 18), borderRadius: u(size, 2) },
        ]}
      />
    </View>
  );
}

/** Circle with a question mark. */
export function HelpIcon({ color, size = 22 }: GlyphProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[styles.abs, outline(size, color), { left: u(size, 3), top: u(size, 3), width: u(size, 18), height: u(size, 18), borderRadius: u(size, 9) }]}
      />
      <Text style={[StyleSheet.absoluteFill, styles.mark, { color, fontSize: u(size, 16), lineHeight: size }]}>?</Text>
    </View>
  );
}

/** Person: a head circle and a shoulder arch, open at the bottom. */
export function PersonIcon({ color, size = 22 }: GlyphProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[styles.abs, outline(size, color), { left: u(size, 7), top: u(size, 3), width: u(size, 10), height: u(size, 10), borderRadius: u(size, 5) }]}
      />
      <View
        style={[
          styles.abs,
          outline(size, color),
          {
            borderBottomWidth: 0,
            left: u(size, 3.5),
            top: u(size, 14),
            width: u(size, 17),
            height: u(size, 7.5),
            borderTopLeftRadius: u(size, 6.5),
            borderTopRightRadius: u(size, 6.5),
          },
        ]}
      />
    </View>
  );
}

/** Magnifier: a ring and a short handle to the lower right. */
export function SearchIcon({ color, size = 22 }: GlyphProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[styles.abs, outline(size, color), { left: u(size, 2.9), top: u(size, 2.9), width: u(size, 16.2), height: u(size, 16.2), borderRadius: u(size, 8.1) }]}
      />
      <View
        style={[
          styles.abs,
          { left: u(size, 15.45), top: u(size, 17.1), width: u(size, 5.5), height: u(size, 2.2), borderRadius: u(size, 1.1), backgroundColor: color, transform: [{ rotate: "45deg" }] },
        ]}
      />
    </View>
  );
}

/** Padlock outline: a body and a shackle arch, open at the bottom. */
export function LockGlyph({ color, size = 16 }: GlyphProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[styles.abs, outline(size, color), { left: u(size, 5), top: u(size, 11), width: u(size, 14), height: u(size, 10), borderRadius: u(size, 2) }]}
      />
      <View
        style={[
          styles.abs,
          outline(size, color),
          {
            borderBottomWidth: 0,
            left: u(size, 8),
            top: u(size, 3),
            width: u(size, 8),
            height: u(size, 8),
            borderTopLeftRadius: u(size, 4),
            borderTopRightRadius: u(size, 4),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: "relative", alignItems: "center", justifyContent: "center" },
  abs: { position: "absolute" },
  mark: { fontFamily: fontFamily.medium, textAlign: "center" },
});
