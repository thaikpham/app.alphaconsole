import { Easing, useColorScheme } from "react-native";
import { colors, radii as tokenRadii, spacing as tokenSpacing } from "./tokens";

// Light palette re-exports tokens.ts where the design matches (SPEC 1.1). Dark is SPEC 1.2.
const lightValues = {
  bg: colors.bg,
  card: colors.card,
  label: colors.label,
  secondary: colors.secondary,
  separator: colors.separator,
  fill: colors.fill,
  accent: colors.accent,
  accentText: "#a8380a",
  accentPressed: "#9a3412",
  accentWash: "#f7e4dc",
  onAccent: colors.onAccent,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutralTint: colors.neutralTint,
  successTint: colors.successTint,
  warningTint: colors.warningTint,
  dangerTint: colors.dangerTint,
  outline: "#c9ced6",
  disabled: "#b8bec7",
  segmentOn: "#ffffff",
  high: "#0b0d12",
  onHigh: "#ffffff",
  highHover: "#2a2f38",
  inverse: "#0b0d12",
  onInverse: "#ffffff",
  inverseAccent: "#ff8a3d",
  scrim: "rgba(11, 13, 18, 0.45)",
};

export type Palette = Record<keyof typeof lightValues, string>;

export const lightPalette: Palette = lightValues;

// accentPressed and the dark tints are not in SPEC 1.2; chosen to keep text pairs at or above 4.5:1.
export const darkPalette: Palette = {
  bg: "#0f1115",
  card: "#1b1e24",
  label: "#eceef2",
  secondary: "#a9b0bb",
  separator: "#30343c",
  fill: "rgba(236, 238, 242, 0.08)",
  accent: "#ff8a3d",
  accentText: "#ff8a3d",
  accentPressed: "#e8772f",
  accentWash: "rgba(255, 138, 61, 0.16)",
  onAccent: "#0b0d12",
  success: "#5cc98a",
  warning: "#f2a54a",
  danger: "#ff7b6e",
  neutralTint: "#2b2f37",
  successTint: "#173a28",
  warningTint: "#3a2a14",
  dangerTint: "#3d1f1c",
  outline: "#6b7280",
  disabled: "#626975",
  segmentOn: "#4a505c",
  high: "#eceef2",
  onHigh: "#0b0d12",
  highHover: "#c9ced6",
  inverse: "#e3e6eb",
  onInverse: "#0b0d12",
  inverseAccent: "#a8380a",
  scrim: "rgba(0, 0, 0, 0.6)",
};

/** Minimum touch target and control height (design v21 section 3). tokens.ts controlHeight (44) is the old value. */
export const controlHeight = 48;

export const spacing = { ...tokenSpacing, s6: 6, s10: 10, s14: 14, xxl: 24 } as const;

export const radii = { ...tokenRadii, sheet: 24 } as const;

export const motion = {
  emphasized: { duration: 400, easing: Easing.bezier(0.2, 0, 0, 1) },
  standard: { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) },
} as const;

/** Palette for the system appearance. Needs `userInterfaceStyle: "automatic"` in app.json to follow the OS. */
export function useTheme(): Palette {
  return useColorScheme() === "dark" ? darkPalette : lightPalette;
}
