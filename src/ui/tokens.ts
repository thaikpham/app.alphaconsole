// Pure design values (SPEC-IOS §1.3, §1.4). No react-native import, so Node tests can load this file.
// Values come from the generated tokens (design/tokens/out/tokens.ts). Values the generator does not have stay here as
// literals, marked "gap", for the Web token owner to add.
import * as generated from "../../design/tokens/out/tokens";

const light = generated.colors.light;
const type = generated.type;

// Light-only subset for the screens that still read `colors` (backups, logs, guide).
export const colors = {
  bg: light.bg,
  card: light.card,
  label: light.label,
  secondary: light.secondary,
  separator: light.separator,
  fill: light.fill,
  accent: light.accent,
  onAccent: light.onAccent,
  success: light.success,
  warning: light.warning,
  danger: light.danger,
  neutralTint: "#e5e8ee", // gap
  successTint: light.successFill,
  warningTint: light.warningFill,
  dangerTint: light.dangerFill,
} as const;

export const typeScale = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.8 }, // gap
  title2: { ...type.title2, fontWeight: "700" },
  title3: { ...type.title3, fontWeight: "600" },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.4 }, // gap
  body: { ...type.body, fontWeight: "400" },
  callout: { ...type.callout, fontWeight: "400" },
  subhead: { ...type.subhead, fontWeight: "400" },
  sectionHeader: { fontSize: 17, lineHeight: 22, fontWeight: "600" }, // gap
  fieldLabel: { fontSize: 15, lineHeight: 20, fontWeight: "600" }, // gap
  footnote: { ...type.footnote, fontWeight: "400" },
  button: { fontSize: 17, lineHeight: 22, fontWeight: "600" }, // gap
  toolbarTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600" }, // gap
} as const;

export const radii = {
  card: generated.radius.card,
  control: generated.radius.control,
  badge: generated.radius.badge,
  pill: 999, // gap
  sheet: generated.radius.sheet,
  tile: 7, // gap
  media: 10, // gap
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, toolbarGroup: generated.spacing.toolbarGroup } as const; // xs..xl: gap

export const rowMinHeight = 52; // gap

export const controlHeight = generated.size.control;

/** Spring configs, by name. Components read them through motion.ts. */
export const springs = generated.motion.spring;

export const durations = generated.motion.duration;

export const press = generated.motion.press;

export const stagger = generated.motion.stagger;

/** Sheet exit curve (ease-in), as cubic-bezier control points. Gap. */
export const exitEase = [0.4, 0, 1, 1] as const;

/** Timings with no generated counterpart. Gap. */
export const timing = {
  mountPollMs: 2_000,
  mountWaitMs: 60_000,
  replugFallbackMs: 8_000,
  sheetCloseHoldMs: 280,
  snackbarPlainMs: 2_400,
  snackbarActionMs: 4_000,
} as const;

/** Offsets for enter transforms. Gap. */
export const distance = { snackbarEnterPx: 8 } as const;

/** Scale at the top of the progress ring's completion pop. Gap. */
export const ringPop = { scale: 1.08 } as const;

/**
 * Drag tuning. dragSlopPx: horizontal movement before a drag takes over from a scroll. flingProjectionS: how far a release
 * carries past its position, in seconds of release velocity, before the snap picks the nearest segment. Gap.
 */
export const gesture = { dragSlopPx: 8, flingProjectionS: 0.2 } as const;

export const glass = {
  ...generated.glass,
  highlightTop: 0.12, // gap: hairline light edge on a thumb
  pressGlowAlpha: 0.18, // gap: press glow inside the glass block
  readabilityScrimAlpha: 0.8, // gap: bottom scrim under text placed on a photo
} as const;
