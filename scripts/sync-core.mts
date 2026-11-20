// Copy the web codec, preset data and app-core modules from ../Web.AlphaColorLab into src/core/web/.
// Usage: node --experimental-strip-types scripts/sync-core.mts [--check]
//   (no flag)  rewrite src/core/web/ from the web working tree and write MANIFEST.json
//   --check    fail (exit 1) if src/core/web/ differs from what a sync would produce
// Copies are byte-for-byte. Nothing under src/core/web/ is generated or hand-edited. The DAT bases
// bundle (lib/app-core/generated/datBases.ts) is generated in the web repo by scripts/gen-app-bases.mts.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = resolve(APP_ROOT, "..", "Web.AlphaColorLab");
const DEST_ROOT = join(APP_ROOT, "src", "core", "web");
const MANIFEST_PATH = "MANIFEST.json";
// Marks the copied codec as ESM, as in the web repo (Node runs the copies without a type-detection warning).
const SCOPE_PKG_PATH = "package.json";
const SCOPE_PKG = '{\n  "type": "module"\n}\n';

// Web files copied as-is (relative to the web repo root, also the path under src/core/web/). The list is owned by the
// web repo (lib/app-core/sync-files.json); the WEB staleness test reads the same list.
const CODE_FILES: string[] = JSON.parse(readWeb("lib/app-core/sync-files.json").toString("utf8")).files;

type Output = Map<string, Buffer>;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readWeb(rel: string): Buffer {
  const abs = join(WEB_ROOT, rel);
  if (!existsSync(abs)) throw new Error(`Missing web source: ${rel} (expected under ${WEB_ROOT})`);
  return readFileSync(abs);
}

// Every relative import in a copied .ts file must point at another copied file, so the copy is self-contained.
function checkClosure(): void {
  const copied = new Set(CODE_FILES);
  const specifier = /(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g;
  for (const rel of CODE_FILES.filter((f) => f.endsWith(".ts"))) {
    const text = readWeb(rel).toString("utf8");
    for (const m of text.matchAll(specifier)) {
      const target = posix.normalize(posix.join(posix.dirname(rel), m[1]));
      if (!copied.has(target)) throw new Error(`${rel} imports ${m[1]} -> ${target}, which is not in CODE_FILES`);
    }
  }
}

function build(): Output {
  checkClosure();
  const out: Output = new Map();
  for (const rel of CODE_FILES) out.set(rel, readWeb(rel));
  out.set(SCOPE_PKG_PATH, Buffer.from(SCOPE_PKG, "utf8"));

  const manifest = {
    source: "../Web.AlphaColorLab (web working tree, copied as-is; edit the web repo, then run npm run sync-core)",
    files: CODE_FILES.map((rel) => ({ path: rel, bytes: out.get(rel)!.length, sha256: sha256(out.get(rel)!) })),
    generated: [{ path: SCOPE_PKG_PATH, from: [], bytes: SCOPE_PKG.length, sha256: sha256(Buffer.from(SCOPE_PKG, "utf8")) }],
  };
  out.set(MANIFEST_PATH, Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8"));
  return out;
}

function listDest(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) files.push(...listDest(abs).map((f) => posix.join(name, f)));
    else files.push(name);
  }
  return files.sort();
}

function check(expected: Output): number {
  const problems: string[] = [];
  for (const [rel, bytes] of expected) {
    const abs = join(DEST_ROOT, rel);
    if (!existsSync(abs)) problems.push(`missing  ${rel}`);
    else if (!readFileSync(abs).equals(bytes)) problems.push(`differs  ${rel}`);
  }
  for (const rel of listDest(DEST_ROOT)) if (!expected.has(rel)) problems.push(`extra    ${rel}`);
  if (problems.length > 0) {
    console.error(`check-core: ${problems.length} problem(s) in src/core/web/. Run npm run sync-core.`);
    for (const p of problems) console.error(`  ${p}`);
    return 1;
  }
  console.log(`check-core: OK, ${expected.size} files in sync with ${relative(APP_ROOT, WEB_ROOT) || "."}`);
  return 0;
}

function write(expected: Output): void {
  rmSync(DEST_ROOT, { recursive: true, force: true });
  for (const [rel, bytes] of expected) {
    const abs = join(DEST_ROOT, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, bytes);
  }
  console.log(`sync-core: wrote ${expected.size} files to src/core/web/ (MANIFEST.json included)`);
}

const expected = build();
if (process.argv.includes("--check")) {
  process.exitCode = check(expected);
} else {
  write(expected);
}
