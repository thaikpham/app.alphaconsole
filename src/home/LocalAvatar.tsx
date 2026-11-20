import { View } from "react-native";

import { PersonIcon } from "@/ui/Glyphs";
import { useTheme } from "@/ui/theme";

/**
 * Neutral profile for the local account (owner decision A/B, SPEC 2.5(a)): a fill circle with a person glyph. There is no sign-in.
 * `diameter` is the circle, `glyph` the person inside it. Decorative: the header or menu text carries the meaning.
 */
export function LocalAvatar({ diameter, glyph, color }: { diameter: number; glyph: number; color: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: theme.fill,
        alignItems: "center",
        justifyContent: "center",
      }}
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      <PersonIcon color={color} size={glyph} />
    </View>
  );
}
