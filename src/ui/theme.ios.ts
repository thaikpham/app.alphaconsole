import { Easing, useColorScheme } from "react-native";
import type { Palette } from "./theme";
import { radii, rowMinHeight, spacing as tokenSpacing } from "./tokens.ios";

// iOS theme (SPEC-IOS §1.1, §1.2). Import values from this file explicitly as "./theme.ios" in .ios files.
// Type-only import of Palette from ./theme is erased at runtime, so this file never loads the base theme.

export { radii, rowMinHeight };
export type { Palette };

type IosKey =
  | "sheet"
  | "fill2"
  | "pro"
  | "prime"
  | "onPrime"
  | "chip"
  | "chipfg"
  | "press"
  | "cell"
  | "edge"
  | "tog";

export type IosPalette = Palette & Record<IosKey, string>;

export const lightPalette: IosPalette = {
  bg: "#f2f2f7",
  card: "#ffffff",
  sheet: "#fafafc",
  label: "#0b0d12",
  secondary: "#4a5260",
  separator: "#e3e6eb",
  fill: "rgba(118, 118, 128, 0.12)",
  fill2: "rgba(118, 118, 128, 0.24)",
  accent: "#c2410c",
  accentText: "#c2410c",
  accentPressed: "#9a3412",
  accentWash: "#f7e4dc",
  pro: "#c2410c",
  prime: "#c2410c",
  onPrime: "#ffffff",
  onAccent: "#ffffff",
  success: "#127a3a",
  warning: "#a84e00",
  danger: "#c8261b",
  neutralTint: "#e5e8ee",
  successTint: "#dcefe3",
  warningTint: "#fbeedb",
  dangerTint: "#fbe5e2",
  outline: "#c9ced6",
  disabled: "#b8bec7",
  segmentOn: "#ffffff",
  high: "#0b0d12",
  chip: "#0b0d12",
  onHigh: "#ffffff",
  chipfg: "#ffffff",
  highHover: "#2a2f38",
  inverse: "#0b0d12",
  onInverse: "#ffffff",
  inverseAccent: "#ff8a3d",
  scrim: "rgba(0, 0, 0, 0.22)",
  press: "#e5e5ea",
  cell: "#ffffff",
  edge: "#f2f2f7",
  tog: "#e3e6eb",
};

// O2 override: prime stays #c2410c in dark, with white text. #ff8a3d is text, icon, and selection only.
export const darkPalette: IosPalette = {
  bg: "#000000",
  card: "#1c1c1e",
  sheet: "#2c2c2e",
  label: "#f5f5f7",
  secondary: "#a1a1a6",
  separator: "#38383a",
  fill: "rgba(118, 118, 128, 0.24)",
  fill2: "rgba(118, 118, 128, 0.36)",
  accent: "#ff8a3d",
  accentText: "#ff8a3d",
  accentPressed: "#e8772f",
  accentWash: "rgba(255, 138, 61, 0.16)",
  pro: "#ff8a3d",
  prime: "#c2410c",
  onPrime: "#ffffff",
  onAccent: "#0b0d12",
  success: "#30d158",
  warning: "#ffb340",
  danger: "#ff6961",
  neutralTint: "#2b2f37",
  successTint: "#173a28",
  warningTint: "#3a2a14",
  dangerTint: "#3d1f1c",
  outline: "#6b7280",
  disabled: "#626975",
  segmentOn: "#636366",
  high: "#f5f5f7",
  chip: "#f5f5f7",
  onHigh: "#0b0d12",
  chipfg: "#0b0d12",
  highHover: "#c9ced6",
  inverse: "#e3e6eb",
  onInverse: "#0b0d12",
  inverseAccent: "#a8380a",
  scrim: "rgba(0, 0, 0, 0.5)",
  press: "#2c2c2e",
  cell: "#333336",
  edge: "#000000",
  tog: "#39393d",
};

export const controlHeight = 50;

export const spacing = { ...tokenSpacing, s6: 6, s10: 10, s14: 14, xxl: 24 } as const;

/** Glass parameters (SPEC-IOS §1.2). gk is the black overlay opacity on the fallback glass. */
export const glass = {
  gt: 0.1,
  gk: { onImage: 0.55, mid: 0.3, dark: 0 },
  border: "rgba(255, 255, 255, 0.24)",
  highlightTop: 0.12,
} as const;

export const motion = {
  emphasized: { duration: 400, easing: Easing.bezier(0.2, 0, 0, 1) },
  standard: { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) },
  spring: {
    sheet: { damping: 26, stiffness: 260 },
    push: { damping: 30, stiffness: 300 },
    btn: { damping: 18, stiffness: 400 },
    seg: { damping: 24, stiffness: 340 },
  },
} as const;

export function useTheme(): IosPalette {
  return useColorScheme() === "dark" ? darkPalette : lightPalette;
}
