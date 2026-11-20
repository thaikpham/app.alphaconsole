// Pure design values. No react-native import, so Node tests can load this file.
// Colours, type, radii, and heights come from the v21 Android set (src/ui/v21.ts, design/v21/SPEC.md §1).
// Motion, glass, and photo values still come from the generated tokens (design/tokens/out/tokens.ts), or are marked "gap".
import * as generated from "../../design/tokens/out/tokens";
import { heights, radii as v21Radii, roles, v21 } from "./v21";

const light = v21.light;

// Light-only subset for the screens that still read `colors` (backups, logs, guide).
export const colors = {
  bg: light.bg,
  card: light.sf,
  label: light.tx,
  secondary: light.tx2,
  separator: light.ln,
  fill: light.sf2,
  accent: v21.primary,
  onAccent: v21.white,
  success: light.ok,
  warning: light.warn,
  danger: light.err,
  neutralTint: light.sf2,
  successTint: light.okTint,
  warningTint: light.warnTint,
  dangerTint: light.errTint,
} as const;

// Role names (SPEC §1.5) are the v21 names. Legacy keys map onto them so existing screens follow the v21 type scale.
export const typeScale = {
  ...roles,
  largeTitle: roles.display,
  title3: roles.h3,
  headline: roles.title,
  callout: roles.bodySm,
  subhead: roles.caption,
  sectionHeader: roles.title,
  fieldLabel: roles.captionStrong,
  footnote: roles.caption,
  button: roles.title,
  toolbarTitle: roles.h2,
} as const;

export const radii = {
  card: v21Radii.card,
  control: v21Radii.control,
  badge: v21Radii.badge,
  pill: v21Radii.pill,
  sheet: v21Radii.sheet,
  toast: v21Radii.toast,
  field: v21Radii.field,
  menu: v21Radii.menu,
  tile: v21Radii.tile,
  media: v21Radii.media,
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, toolbarGroup: generated.spacing.toolbarGroup } as const; // xs..xl: gap

export const rowMinHeight = 52;

export const controlHeight = heights.control;

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

/** Photo surfaces (L7): labels drawn over a photo, and the solid ground behind a photo. Gap: the generator has no photo tokens. */
export const photoLabel = "#ffffff"; // gap
export const photoScrim = "#000000"; // gap
