// Publish the Expo web export (dist-web/, from `npm run export:web`) to ../Web.AlphaColorLab/public/console-app/.
// Usage: node --experimental-strip-types scripts/publish-web.mts
//   Replaces the whole target directory. Writes VERSION.json { appVersion, gitSha, coreHash }, patches the exported
//   index.html (PWA head tags, service worker registration) and fills the BUILD_ID and PRECACHE constants of sw.js.
//   The WEB test test/console-app-sync.test.ts recomputes coreHash from lib/app-core/sync-files.json.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = resolve(APP_ROOT, "..", "Web.AlphaColorLab");
const DIST = join(APP_ROOT, "dist-web");
const TARGET = join(WEB_ROOT, "public", "console-app");
const CORE_DIR = join(APP_ROOT, "src", "core", "web");
const BASE = "/console-app";
const HEAD_START = "<!-- console-app:head -->";
const HEAD_END = "<!-- /console-app:head -->";

const HEAD = [
  HEAD_START,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<meta name="theme-color" content="#f2f2f7">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="Alpha Console">',
  `<link rel="manifest" href="${BASE}/manifest.webmanifest">`,
  `<link rel="apple-touch-icon" sizes="180x180" href="${BASE}/icons/apple-touch-icon.png">`,
  "<title>Alpha Console</title>",
  "<style>html,body{background:#f2f2f7}</style>",
  "<script>",
  `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("${BASE}/sw.js",{scope:"${BASE}/"}).catch(function(e){console.warn("console-app sw:",e)})})}`,
  "</script>",
  HEAD_END,
].join("\n");

// Lists every file under dir as a posix relative path.
function listFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...listFiles(abs, rel));
    else out.push(rel);
  }
  return out;
}

// Same algorithm as the WEB test (test/console-app-sync.test.ts): sha256 over relPath, NUL, bytes, NUL, in sorted relPath order.
function coreHash(): string {
  if (!existsSync(CORE_DIR)) throw new Error("src/core/web/ is missing: run npm run sync-core first");
  const files = listFiles(CORE_DIR)
    .filter((rel) => rel !== "MANIFEST.json" && rel !== "package.json")
    .sort();
  const hash = createHash("sha256");
  for (const rel of files) {
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(join(CORE_DIR, rel)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function appVersion(): string {
  const app = JSON.parse(readFileSync(join(APP_ROOT, "app.json"), "utf8")) as { expo: { version: string } };
  return app.expo.version;
}

function gitSha(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: APP_ROOT, encoding: "utf8" }).trim();
}

// Removes the head block from an earlier publish, then writes the current one. The exported page keeps its own head.
function patchIndex(html: string): string {
  const cleaned = html
    .replace(new RegExp(`${HEAD_START}[\\s\\S]*?${HEAD_END}\\n?`), "")
    .replace(/<meta[^>]*name="viewport"[^>]*>\s*/i, "")
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "");
  if (!cleaned.includes(`${BASE}/_expo/`)) throw new Error("dist-web/index.html does not point at /console-app/_expo/: export without EXPO_BASE_URL=/console-app");
  if (!/<\/head>/i.test(cleaned)) throw new Error("dist-web/index.html has no </head>");
  return cleaned.replace(/<html[^>]*>/i, '<html lang="vi">').replace(/<\/head>/i, () => `${HEAD}\n</head>`);
}

// The exported sw.js holds two constants to fill. Each is anchored to its declaration, so the header comment is never touched.
function patchServiceWorker(buildId: string, precache: string[]): void {
  const file = join(DIST, "sw.js");
  if (!existsSync(file)) throw new Error("dist-web/sw.js is missing: public/sw.js was not exported");
  const src = readFileSync(file, "utf8");
  const buildLine = 'const BUILD_ID = "__BUILD_ID__";';
  const precacheLine = "const PRECACHE = __PRECACHE__;";
  if (!src.includes(buildLine) || !src.includes(precacheLine)) throw new Error("dist-web/sw.js has no placeholders: run npm run export:web again");
  const out = src
    .replace(buildLine, () => `const BUILD_ID = ${JSON.stringify(buildId)};`)
    .replace(precacheLine, () => `const PRECACHE = ${JSON.stringify(precache)};`);
  writeFileSync(file, out);
}

function totalBytes(dir: string): number {
  return listFiles(dir).reduce((sum, rel) => sum + statSync(join(dir, rel)).size, 0);
}

function main(): void {
  if (!existsSync(join(DIST, "index.html"))) throw new Error("dist-web/ is missing: run npm run export:web first");
  if (!existsSync(WEB_ROOT)) throw new Error(`Web repo not found at ${WEB_ROOT}`);

  const version = { appVersion: appVersion(), gitSha: gitSha(), coreHash: coreHash() };
  const buildId = `${version.appVersion}-${version.gitSha.slice(0, 7)}-${version.coreHash.slice(0, 8)}`;

  const indexPath = join(DIST, "index.html");
  writeFileSync(indexPath, patchIndex(readFileSync(indexPath, "utf8")));
  writeFileSync(join(DIST, "VERSION.json"), JSON.stringify(version, null, 2) + "\n");

  const precache = listFiles(DIST)
    .filter((rel) => rel !== "sw.js")
    .sort()
    .map((rel) => `${BASE}/${rel}`);
  patchServiceWorker(buildId, precache);

  rmSync(TARGET, { recursive: true, force: true });
  cpSync(DIST, TARGET, { recursive: true });

  const mb = (totalBytes(TARGET) / 1024 / 1024).toFixed(2);
  console.log(`publish-web: ${precache.length} files, ${mb} MB -> public/console-app/ (build ${buildId})`);
}

try {
  main();
} catch (e) {
  console.error(`publish-web: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
