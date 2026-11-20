import { Platform, useColorScheme } from "react-native";
import { controlHeight, radii, rowMinHeight, spacing as tokenSpacing } from "./tokens";
import { v21 } from "./v21";

// One palette for Android and web, from the v21 Android set (design/v21/SPEC.md §1.2). Keys keep their names.

export { controlHeight, radii, rowMinHeight };

const L = v21.light;
const D = v21.dark;

export const lightPalette = {
  bg: L.bg,
  card: L.sf,
  sheet: L.sh,
  label: L.tx,
  secondary: L.tx2,
  separator: L.ln,
  fill: L.sf2,
  fill2: L.sfh,
  accent: L.aci,
  accentText: L.acx,
  accentPressed: v21.primaryActive,
  accentWash: L.acw,
  pro: L.acx,
  prime: v21.primary,
  onPrime: v21.white,
  onAccent: v21.white,
  success: L.ok,
  warning: L.warn,
  danger: L.err,
  neutralTint: L.sf2,
  successTint: L.okTint,
  warningTint: L.warnTint,
  dangerTint: L.errTint,
  outline: L.ol,
  disabled: L.dis,
  segmentOn: L.segon,
  high: L.hi,
  chip: L.hi,
  onHigh: L.hitx,
  chipfg: L.hitx,
  highHover: L.hih,
  inverse: L.inv,
  onInverse: L.invtx,
  inverseAccent: L.invac,
  scrim: L.scrim,
  press: L.sf2,
  cell: L.sf,
  edge: L.bg,
  tog: L.ln,
};

export type Palette = { [K in keyof typeof lightPalette]: string };

// Prime (#c2410c) stays the primary fill in dark, with white text. #ff8a3d is text, icon, and selection only.
export const darkPalette: Palette = {
  bg: D.bg,
  card: D.sf,
  sheet: D.sh,
  label: D.tx,
  secondary: D.tx2,
  separator: D.ln,
  fill: D.sf2,
  fill2: D.sfh,
  accent: D.aci,
  accentText: D.acx,
  accentPressed: v21.primaryActive,
  accentWash: D.acw,
  pro: D.acx,
  prime: v21.primary,
  onPrime: v21.white,
  onAccent: v21.white,
  success: D.ok,
  warning: D.warn,
  danger: D.err,
  neutralTint: D.sf2,
  successTint: D.okTint,
  warningTint: D.warnTint,
  dangerTint: D.errTint,
  outline: D.ol,
  disabled: D.dis,
  segmentOn: D.segon,
  high: D.hi,
  chip: D.hi,
  onHigh: D.hitx,
  chipfg: D.hitx,
  highHover: D.hih,
  inverse: D.inv,
  onInverse: D.invtx,
  inverseAccent: D.invac,
  scrim: D.scrim,
  press: D.sf2,
  cell: D.sf,
  edge: D.bg,
  tog: D.ln,
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
