import { Easing } from "react-native";

// Light values from AlphaColorLab/design/tokens/tokens.json (web repo, canonical). Generated full set incl. dark: design/tokens/out/tokens.ts.
export const colors = {
  bg: "#f2f2f7",
  card: "#ffffff",
  label: "#0b0d12",
  secondary: "#4a5260",
  separator: "#e3e6eb",
  fill: "rgba(11, 13, 18, 0.05)",
  accent: "#c2410c",
  onAccent: "#ffffff",
  success: "#127a3a",
  warning: "#a84e00",
  danger: "#c8261b",
  neutralTint: "#e5e8ee",
  successTint: "#dcefe3",
  warningTint: "#fbeedb",
  dangerTint: "#fbe5e2",
} as const;

export const fonts = {
  regular: "NotoSans_400Regular",
  medium: "NotoSans_500Medium",
  semibold: "NotoSans_600SemiBold",
  bold: "NotoSans_700Bold",
} as const;

export const typeScale = {
  title2: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  title3: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 27 },
  callout: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  subhead: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  button: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
} as const;

export const radii = { card: 24, control: 14, badge: 8, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

export const controlHeight = 44;

export const easing = Easing.bezier(0.16, 1, 0.3, 1);
