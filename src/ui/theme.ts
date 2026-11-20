import { Platform, useColorScheme } from "react-native";
import * as generated from "../../design/tokens/out/tokens";
import { controlHeight, radii, rowMinHeight, spacing as tokenSpacing } from "./tokens";

// Unified theme (SPEC-IOS §1.1, §1.2): one palette, one set of shape values for Android and iOS.
// Colors come from the generated tokens. Keys the generator does not have are literals, marked "gap" (see tokens.ts).

export { controlHeight, radii, rowMinHeight };

const L = generated.colors.light;
const D = generated.colors.dark;

export const lightPalette = {
  bg: L.bg,
  card: L.card,
  sheet: L.cardElevated,
  label: L.label,
  secondary: L.secondary,
  separator: L.separator,
  fill: L.fill,
  fill2: L.fillStrong,
  accent: L.accent,
  accentText: L.accentText,
  accentPressed: "#9a3412", // gap
  accentWash: "#f7e4dc", // gap
  pro: L.accentText,
  prime: L.accent,
  onPrime: L.onAccent,
  onAccent: L.onAccent,
  success: L.success,
  warning: L.warning,
  danger: L.danger,
  neutralTint: "#e5e8ee", // gap
  successTint: L.successFill,
  warningTint: L.warningFill,
  dangerTint: L.dangerFill,
  outline: "#c9ced6", // gap
  disabled: "#b8bec7", // gap
  segmentOn: L.card,
  high: L.label,
  chip: L.label,
  onHigh: L.onAccent,
  chipfg: L.onAccent,
  highHover: "#2a2f38", // gap
  inverse: L.label,
  onInverse: L.onAccent,
  inverseAccent: "#ff8a3d", // gap
  scrim: "rgba(0, 0, 0, 0.22)", // gap
  press: "#e5e5ea", // gap
  cell: L.card,
  edge: L.bg,
  tog: L.separator,
};

export type Palette = { [K in keyof typeof lightPalette]: string };

// O2 override: prime stays #c2410c in dark, with white text. #ff8a3d is text, icon, and selection only.
export const darkPalette: Palette = {
  bg: D.bg,
  card: D.card,
  sheet: D.cardElevated,
  label: D.label,
  secondary: D.secondary,
  separator: D.separator,
  fill: D.fill,
  fill2: D.fillStrong,
  accent: D.accent,
  accentText: D.accentText,
  accentPressed: "#e8772f", // gap
  accentWash: "rgba(255, 138, 61, 0.16)", // gap
  pro: D.accentText,
  prime: D.accent,
  onPrime: D.onAccent,
  onAccent: D.onAccent,
  success: D.success,
  warning: D.warning,
  danger: D.danger,
  neutralTint: "#2b2f37", // gap
  successTint: D.successFill,
  warningTint: D.warningFill,
  dangerTint: D.dangerFill,
  outline: "#6b7280", // gap
  disabled: "#626975", // gap
  segmentOn: "#636366", // gap
  high: D.label,
  chip: D.label,
  onHigh: "#0b0d12", // gap
  chipfg: "#0b0d12", // gap
  highHover: "#c9ced6", // gap
  inverse: "#e3e6eb", // gap
  onInverse: "#0b0d12", // gap
  inverseAccent: "#a8380a", // gap
  scrim: "rgba(0, 0, 0, 0.5)", // gap
  press: "#2c2c2e", // gap
  cell: "#333336", // gap
  edge: D.bg,
  tog: "#39393d", // gap
};

export const spacing = { ...tokenSpacing, s6: 6, s10: 10, s14: 14, xxl: 24 } as const;

/** Dark only on native: the web build (alphacolorlab.com/console) is light-only, like the rest of the site. */
export function useIsDark(): boolean {
  const scheme = useColorScheme();
  return Platform.OS !== "web" && scheme === "dark";
}

export function useTheme(): Palette {
  return useIsDark() ? darkPalette : lightPalette;
}
