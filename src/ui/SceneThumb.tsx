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
  style?: StyleProp<ViewStyle>;
};

/** Scene preview from the bundled photos. Crops to fill the frame; the default frame is 3:2. Radius is 10 on iOS (media). */
export function SceneThumb({ scene, overlay, style }: Props) {
  return (
    <View style={[styles.frame, style]}>
      <Image source={scenes[scene]} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {overlay ? <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 1.5, borderRadius: radii.media, overflow: "hidden" },
});
