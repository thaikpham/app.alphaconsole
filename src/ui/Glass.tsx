import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** iOS: press feedback on the native glass. */
  interactive?: boolean;
  /** iOS: glass sits on a sheet, so the solid fallback uses `cell`. */
  onSheet?: boolean;
  /** iOS: glass sits over a photo, so the fallback darkens more. */
  onImage?: boolean;
};

export type GlassContainerProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** iOS: distance at which neighbouring glass shapes merge. */
  spacing?: number;
};

/** Android has no Liquid Glass. This stub keeps the iOS API so shared code compiles. Renders a plain View. */
export function Glass({ children, style }: GlassProps) {
  return <View style={style}>{children}</View>;
}

export function GlassContainer({ children, style }: GlassContainerProps) {
  return <View style={style}>{children}</View>;
}
