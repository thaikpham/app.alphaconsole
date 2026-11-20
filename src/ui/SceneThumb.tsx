import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { radii } from "./theme";

export type SceneName = "night" | "portrait" | "street" | "sunset";

const scenes: Record<SceneName, ImageSourcePropType> = {
  night: require("../../assets/scenes/night.jpg"),
  portrait: require("../../assets/scenes/portrait.jpg"),
  street: require("../../assets/scenes/street.jpg"),
  sunset: require("../../assets/scenes/sunset.jpg"),
};

type Props = {
  scene: SceneName;
  /** Translucent color drawn over the photo for one look (for example rgba(...)). The photo is shown plain when omitted. */
  overlay?: string;
  /** CSS filter for the slot look (design SCENE0). Android and web draw all of it; iOS draws brightness only. */
  filter?: string;
  /** Zoom of the photo inside the frame (design SCENE0), anchored at `focusY` (design: 45% for slots, 40% for the hero). */
  scale?: number;
  focusY?: number;
  /** Design `.rd`: black 80% at the bottom fading to clear at the middle, under text set on the photo. */
  scrim?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Scene preview from the bundled photos. Crops to fill the frame; the default frame is 3:2. Background #2a2f38 shows while loading (design `.ph`). */
export function SceneThumb({ scene, overlay, filter, scale = 1, focusY = 45, scrim = false, style }: Props) {
  return (
    <View style={[styles.frame, style]}>
      <Image
        source={scenes[scene]}
        resizeMode="cover"
        style={[
          styles.photo,
          filter && filter !== "none" ? { filter } : null,
          scale !== 1 ? { transform: [{ scale }], transformOrigin: `50% ${focusY}%` } : null,
        ]}
      />
      {overlay ? <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} /> : null}
      {scrim ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 1.5, borderRadius: radii.media, overflow: "hidden", backgroundColor: "#2a2f38" },
  // Explicit size: react-native-web gives an Image its intrinsic size (720×480) when the style has no width/height.
  photo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  scrim: { experimental_backgroundImage: "linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0) 50%)" },
});
