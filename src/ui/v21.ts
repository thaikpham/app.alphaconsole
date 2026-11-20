// v21 Android design values, verbatim from design/v21/SPEC.md (colours §1.2, motion §1.4, type §1.5, radii §1.6,
// heights §1.8). Pure values: no react-native import, so Node tests can load this file.
// Not generated: the Web token pipeline (design/tokens/out) is iOS-based and stays unused by the palette.

export const v21 = {
  light: {
    bg: "#f2f2f7",
    sf: "#ffffff",
    sh: "#ffffff",
    sf2: "#f2f2f7",
    sfh: "#fafafb",
    tx: "#0b0d12",
    tx2: "#4a5260",
    ln: "#e3e6eb",
    segon: "#ffffff",
    ol: "#c9ced6",
    dis: "#b8bec7",
    hi: "#0b0d12",
    hitx: "#ffffff",
    hih: "#2a2f38",
    acx: "#a8380a",
    acw: "#f7e4dc",
    aci: "#c2410c",
    ok: "#127a3a",
    warn: "#a84e00",
    err: "#c8261b",
    inv: "#0b0d12",
    invtx: "#ffffff",
    invac: "#ff8a3d",
    scrim: "rgba(11, 13, 18, 0.45)",
    // Status tints are not in the design. Derived: the status colour at 12% alpha.
    okTint: "rgba(18, 122, 58, 0.12)",
    warnTint: "rgba(168, 78, 0, 0.12)",
    errTint: "rgba(200, 38, 27, 0.12)",
  },
  dark: {
    bg: "#0f1115",
    sf: "#1b1e24",
    sh: "#23262d",
    sf2: "#2b2f37",
    sfh: "#24282f",
    tx: "#eceef2",
    tx2: "#a9b0bb",
    ln: "#30343c",
    segon: "#4a505c",
    ol: "#6b7280",
    dis: "#626975",
    hi: "#eceef2",
    hitx: "#0b0d12",
    hih: "#c9ced6",
    acx: "#ff8a3d",
    acw: "rgba(255, 138, 61, 0.16)",
    aci: "#ff8a3d",
    ok: "#5cc98a",
    warn: "#f2a54a",
    err: "#ff7b6e",
    inv: "#e3e6eb",
    invtx: "#0b0d12",
    invac: "#a8380a",
    scrim: "rgba(0, 0, 0, 0.6)",
    okTint: "rgba(92, 201, 138, 0.16)",
    warnTint: "rgba(242, 165, 74, 0.16)",
    errTint: "rgba(255, 123, 110, 0.16)",
  },
  /** Primary button fill is #c2410c in both schemes, with white text. Hover and pressed states are fixed too. */
  primary: "#c2410c",
  primaryHover: "#a8380a",
  primaryActive: "#9a3412",
  white: "#ffffff",
} as const;

/** Noto Sans, one family name per weight (names of @expo-google-fonts/noto-sans exports). */
export const fontFamily = {
  regular: "NotoSans_400Regular",
  medium: "NotoSans_500Medium",
  semibold: "NotoSans_600SemiBold",
  bold: "NotoSans_700Bold",
} as const;

const F = fontFamily;

/** Type roles, size/line/weight from SPEC §1.5. The weight lives in the family name: Android cannot pick weights of one file. */
export const roles = {
  display: { fontSize: 32, lineHeight: 40, fontFamily: F.bold },
  displaySm: { fontSize: 30, lineHeight: 40, fontFamily: F.bold },
  progressNum: { fontSize: 44, lineHeight: 52, fontFamily: F.bold },
  h1: { fontSize: 28, lineHeight: 36, fontFamily: F.bold },
  h2: { fontSize: 24, lineHeight: 32, fontFamily: F.bold },
  title2: { fontSize: 22, lineHeight: 28, fontFamily: F.bold },
  h3: { fontSize: 20, lineHeight: 28, fontFamily: F.bold },
  title: { fontSize: 17, lineHeight: 24, fontFamily: F.semibold },
  titleBold: { fontSize: 17, lineHeight: 24, fontFamily: F.bold },
  body: { fontSize: 17, lineHeight: 24, fontFamily: F.regular },
  bodySm: { fontSize: 16, lineHeight: 24, fontFamily: F.regular },
  label: { fontSize: 16, lineHeight: 24, fontFamily: F.semibold },
  labelSm: { fontSize: 16, lineHeight: 22, fontFamily: F.semibold },
  labelBold: { fontSize: 16, lineHeight: 24, fontFamily: F.bold },
  captionStrong: { fontSize: 15, lineHeight: 20, fontFamily: F.semibold },
  caption: { fontSize: 15, lineHeight: 20, fontFamily: F.regular },
} as const;

/** Radii in px (SPEC §1.6). Circles and pills use 999. */
export const radii = {
  pill: 999,
  card: 24,
  sheet: 24,
  toast: 14,
  menu: 16,
  tile: 12,
  control: 8,
  media: 8,
  badge: 4,
  hairline: 2,
} as const;

/** Heights (SPEC §1.8): 48px controls, 56px search field, 72px steppers. */
export const heights = { control: 48, icon: 32, search: 56, stepper: 72, row: 56 } as const;

/** Android motion (SPEC §1.4). Ease arrays are cubic-bezier control points. */
export const motion = {
  backgroundMs: 300,
  backgroundEase: [0.16, 1, 0.3, 1],
  growMs: 400,
  growEase: [0.2, 0, 0, 1],
  ringMs: 400,
  spinnerMs: 800,
  pulseMs: 1400,
  popMs: 600,
  popEase: [0.16, 1, 0.3, 1],
} as const;
