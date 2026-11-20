/**
 * Drift guard for src/ui/theme.ts, src/ui/tokens.ts, and src/ui/v21.ts.
 * Palette, type, radii, and heights come from the v21 Android set (design/v21/SPEC.md). Motion and glass still come from
 * design/tokens/out/tokens.ts. Same loader as theme.test.ts: react-native is stubbed, and extensionless relative imports resolve to .ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import * as generated from "../design/tokens/out/tokens.ts";

const STUB = "stub:react-native";
const STUB_SOURCE = `
export function useColorScheme() { return "light"; }
export const Platform = { OS: "android" };
`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "react-native") return { url: STUB, shortCircuit: true };
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (relative && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === STUB) return { format: "module", source: STUB_SOURCE, shortCircuit: true };
    return nextLoad(url, context);
  },
});

const { lightPalette, darkPalette, radii, spacing } = await import("../src/ui/theme.ts");
const tokens = await import("../src/ui/tokens.ts");
const { v21, radii: v21Radii, fontFamily, roles } = await import("../src/ui/v21.ts");

const L = v21.light;
const D = v21.dark;

/** Palette keys that take a v21 colour, and the v21 key they take it from. */
const DERIVED: [keyof typeof lightPalette, keyof typeof L][] = [
  ["bg", "bg"],
  ["card", "sf"],
  ["sheet", "sh"],
  ["label", "tx"],
  ["secondary", "tx2"],
  ["separator", "ln"],
  ["fill", "sf2"],
  ["fill2", "sfh"],
  ["accent", "aci"],
  ["accentText", "acx"],
  ["accentWash", "acw"],
  ["success", "ok"],
  ["warning", "warn"],
  ["danger", "err"],
  ["successTint", "okTint"],
  ["warningTint", "warnTint"],
  ["dangerTint", "errTint"],
  ["outline", "ol"],
  ["disabled", "dis"],
  ["segmentOn", "segon"],
  ["high", "hi"],
  ["onHigh", "hitx"],
  ["highHover", "hih"],
  ["inverse", "inv"],
  ["onInverse", "invtx"],
  ["inverseAccent", "invac"],
  ["scrim", "scrim"],
  ["tog", "ln"],
];

test("both palettes read their colors from the v21 light and dark sets", () => {
  for (const [name, palette, set] of [
    ["light", lightPalette, L],
    ["dark", darkPalette, D],
  ] as const) {
    for (const [key, token] of DERIVED) assert.equal(palette[key], set[token], `${name} ${key}`);
  }
});

test("primary fill is #c2410c with white text in both schemes", () => {
  for (const palette of [lightPalette, darkPalette]) {
    assert.equal(palette.prime, "#c2410c");
    assert.equal(palette.onPrime, "#ffffff");
  }
});

test("theme radii and spacing come from the v21 set", () => {
  assert.equal(radii.card, v21Radii.card);
  assert.equal(radii.control, v21Radii.control);
  assert.equal(radii.badge, v21Radii.badge);
  assert.equal(radii.sheet, v21Radii.sheet);
  assert.equal(radii.pill, 999);
  assert.equal(spacing.md, 12);
  assert.equal(spacing.lg, 16);
});

test("tokens.ts size, motion, and glass come from the v21 and generated sets", () => {
  assert.equal(tokens.controlHeight, 48);
  assert.deepEqual(tokens.springs, generated.motion.spring);
  assert.deepEqual(tokens.durations, generated.motion.duration);
  assert.deepEqual(tokens.press, generated.motion.press);
  assert.deepEqual(tokens.stagger, generated.motion.stagger);
  assert.deepEqual(tokens.glass.regular, generated.glass.regular);
  assert.deepEqual(tokens.glass.clear, generated.glass.clear);
  assert.deepEqual(tokens.glass.prominent, generated.glass.prominent);
});

/** SPEC §1.5 type roles: [role, size, line, family]. */
const SPEC_ROLES: [keyof typeof roles, number, number, string][] = [
  ["title", 17, 24, fontFamily.semibold],
  ["body", 17, 24, fontFamily.regular],
  ["captionStrong", 15, 20, fontFamily.semibold],
  ["caption", 15, 20, fontFamily.regular],
  ["label", 16, 24, fontFamily.semibold],
  ["h3", 20, 28, fontFamily.bold],
  ["title2", 22, 28, fontFamily.bold],
  ["h2", 24, 32, fontFamily.bold],
  ["labelSm", 16, 22, fontFamily.semibold],
  ["h1", 28, 36, fontFamily.bold],
  ["titleBold", 17, 24, fontFamily.bold],
  ["display", 32, 40, fontFamily.bold],
  ["displaySm", 30, 40, fontFamily.bold],
  ["progressNum", 44, 52, fontFamily.bold],
  ["labelBold", 16, 24, fontFamily.bold],
  ["bodySm", 16, 24, fontFamily.regular],
];

test("type roles match SPEC §1.5 and are at least 15px", () => {
  for (const [role, size, line, family] of SPEC_ROLES) {
    assert.deepEqual(roles[role], { fontSize: size, lineHeight: line, fontFamily: family }, role);
    assert.ok(size >= 15, `${role} below 15px`);
  }
});

test("legacy typeScale keys point at v21 roles", () => {
  assert.equal(tokens.typeScale.body, roles.body);
  assert.equal(tokens.typeScale.footnote, roles.caption);
  assert.equal(tokens.typeScale.toolbarTitle, roles.h2);
});
