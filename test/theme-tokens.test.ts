/**
 * Drift guard for src/ui/theme.ts and src/ui/tokens.ts: their values must come from design/tokens/out/tokens.ts.
 * Same loader as theme.test.ts: react-native is stubbed, and extensionless relative imports resolve to .ts.
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

const L = generated.colors.light;
const D = generated.colors.dark;

/** Palette keys that take a generated color, and the generated key they take it from. */
const DERIVED: [keyof typeof lightPalette, keyof typeof L][] = [
  ["bg", "bg"],
  ["card", "card"],
  ["sheet", "cardElevated"],
  ["label", "label"],
  ["secondary", "secondary"],
  ["separator", "separator"],
  ["fill", "fill"],
  ["fill2", "fillStrong"],
  ["accent", "accent"],
  ["accentText", "accentText"],
  ["onAccent", "onAccent"],
  ["success", "success"],
  ["warning", "warning"],
  ["danger", "danger"],
  ["successTint", "successFill"],
  ["warningTint", "warningFill"],
  ["dangerTint", "dangerFill"],
];

test("both palettes read their colors from the generated light and dark sets", () => {
  for (const [name, palette, set] of [
    ["light", lightPalette, L],
    ["dark", darkPalette, D],
  ] as const) {
    for (const [key, token] of DERIVED) assert.equal(palette[key], set[token], `${name} ${key}`);
  }
});

test("theme radii and spacing come from the generated set", () => {
  assert.equal(radii.card, generated.radius.card);
  assert.equal(radii.control, generated.radius.control);
  assert.equal(radii.badge, generated.radius.badge);
  assert.equal(radii.sheet, generated.radius.sheet);
  assert.equal(spacing.toolbarGroup, generated.spacing.toolbarGroup);
});

test("tokens.ts size, motion, and glass come from the generated set", () => {
  assert.equal(tokens.controlHeight, generated.size.control);
  assert.deepEqual(tokens.springs, generated.motion.spring);
  assert.deepEqual(tokens.durations, generated.motion.duration);
  assert.deepEqual(tokens.press, generated.motion.press);
  assert.deepEqual(tokens.stagger, generated.motion.stagger);
  assert.deepEqual(tokens.glass.regular, generated.glass.regular);
  assert.deepEqual(tokens.glass.clear, generated.glass.clear);
  assert.deepEqual(tokens.glass.prominent, generated.glass.prominent);
});

test("type sizes come from the generated type scale", () => {
  for (const key of ["footnote", "subhead", "callout", "body", "title3", "title2"] as const) {
    assert.equal(tokens.typeScale[key].fontSize, generated.type[key].fontSize, `${key} fontSize`);
    assert.equal(tokens.typeScale[key].lineHeight, generated.type[key].lineHeight, `${key} lineHeight`);
  }
});
