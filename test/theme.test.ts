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
export const Platform = { OS: globalThis.__aclOS ?? "android" };
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

type Rgba = { r: number; g: number; b: number; a: number };

/** Hex (#rrggbb), or rgba() with 0-255 channels and alpha 0-1. */
function parse(color: string): Rgba {
  if (color.startsWith("#")) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    return { r, g, b, a: 1 };
  }
  const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
  return { r, g, b, a };
}

/** Composites a translucent color over an opaque one and returns hex. Opaque colors come back unchanged. */
function flatten(color: string, over: string): string {
  const top = parse(color);
  if (top.a === 1) return color;
  const base = parse(over);
  const mix = (c: number, u: number) => Math.round(top.a * c + (1 - top.a) * u);
  const hex = [mix(top.r, base.r), mix(top.g, base.g), mix(top.b, base.b)].map((v) => v.toString(16).padStart(2, "0"));
  return `#${hex.join("")}`;
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
      assert.ok(contrast(p[text], flatten(p[surface], p.card)) >= 4.5, `${text} on ${surface}`);
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
