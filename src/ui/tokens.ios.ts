import { Easing } from "react-native";

// iOS token values. Mirrors tokens.ts with iOS type and shape values (SPEC-IOS §1.3, §1.4).
// Must not import ./tokens or ./theme: on iOS Metro resolves those names to this family, which would import itself.

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

// System font on iOS (O9). Kept with the same keys so imports still compile; typeScale below sets no fontFamily.
export const fonts = {
  regular: "NotoSans_400Regular",
  medium: "NotoSans_500Medium",
  semibold: "NotoSans_600SemiBold",
  bold: "NotoSans_700Bold",
} as const;

export const typeScale = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.8 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.4 },
  title3: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.4 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400" },
  callout: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.2 },
  sectionHeader: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  fieldLabel: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  footnote: { fontSize: 13, lineHeight: 19, fontWeight: "400" },
  button: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  toolbarTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
} as const;

export const radii = { card: 26, control: 14, badge: 8, pill: 999, sheet: 24, tile: 7, media: 10 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

export const controlHeight = 44;

export const rowMinHeight = 52;

export const easing = Easing.bezier(0.16, 1, 0.3, 1);
