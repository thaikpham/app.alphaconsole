/**
 * Palette parity and contrast for src/ui/theme.ts.
 * react-native cannot load under plain Node (Flow syntax), so the hooks stub it and resolve extensionless relative imports (./tokens) to .ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const STUB = "stub:react-native";
const STUB_SOURCE = `
export const Easing = { bezier: () => (t) => t };
export function useColorScheme() { return globalThis.__aclScheme ?? "light"; }
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

const { lightPalette, darkPalette, useTheme } = await import("../src/ui/theme.ts");
const g = globalThis as { __aclScheme?: string };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("light and dark palettes have the same keys", () => {
  assert.deepEqual(Object.keys(darkPalette).sort(), Object.keys(lightPalette).sort());
});

test("accent vs white is at least 4.5:1 in light, and onAccent vs accent in both palettes", () => {
  assert.ok(contrast(lightPalette.accent, "#ffffff") >= 4.5);
  for (const p of [lightPalette, darkPalette]) assert.ok(contrast(p.onAccent, p.accent) >= 4.5);
});

test("text on its surface is at least 4.5:1 in both palettes", () => {
  const pairs: [keyof typeof lightPalette, keyof typeof lightPalette][] = [
    ["accentText", "bg"],
    ["label", "bg"],
    ["secondary", "card"],
    ["label", "neutralTint"],
    ["secondary", "neutralTint"],
    ["success", "successTint"],
    ["warning", "warningTint"],
    ["danger", "dangerTint"],
    ["label", "segmentOn"],
    ["onInverse", "inverse"],
    ["inverseAccent", "inverse"],
    ["onHigh", "high"],
  ];
  for (const p of [lightPalette, darkPalette]) {
    for (const [text, surface] of pairs) {
      assert.ok(contrast(p[text], p[surface]) >= 4.5, `${text} on ${surface}`);
    }
  }
});

test("useTheme picks the palette from the system scheme", () => {
  try {
    g.__aclScheme = "dark";
    assert.equal(useTheme(), darkPalette);
    g.__aclScheme = "light";
    assert.equal(useTheme(), lightPalette);
  } finally {
    delete g.__aclScheme;
  }
});
