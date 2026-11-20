// Build the Android release APK and publish it to the site:
//   GitHub Release app-v<version> on GH_REPO (asset alpha-console-<version>.apk, uploaded with `gh`; the site's QR and
//   download buttons point at it, public/downloads/ is not deployed),
//   ../Web.AlphaColorLab/public/downloads/alpha-console-<version>.apk (local copy; older alpha-console-*.apk are removed)
//   ../Web.AlphaColorLab/data/app-release.json, android block (ios block untouched).
// Usage: npm run release:android   (not part of npm run sync)
// Needs a JDK 17 at RELEASE_JAVA_HOME (default /home/thaikpham/.local/jdk-17). Refuses to run if the core copy is stale.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = resolve(APP_ROOT, "..", "Web.AlphaColorLab");
const ANDROID_DIR = join(APP_ROOT, "android");
const APK_BUILD = join(ANDROID_DIR, "app", "build", "outputs", "apk", "release", "app-release.apk");
const MANIFEST_DIR = join(ANDROID_DIR, "app", "build", "intermediates", "merged_manifest", "release");
const DOWNLOADS = join(WEB_ROOT, "public", "downloads");
const RELEASE_JSON = join(WEB_ROOT, "data", "app-release.json");
const GH_REPO = process.env.RELEASE_GH_REPO ?? "thaikpham/alphacolorlab.com";
const JAVA_HOME = process.env.RELEASE_JAVA_HOME ?? "/home/thaikpham/.local/jdk-17";
// Android SDK: ANDROID_HOME, else the Android Studio default (~/Android/Sdk). android/local.properties is not required.
const ANDROID_HOME = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? join(process.env.HOME ?? "", "Android", "Sdk");
const APK_NAME = /^alpha-console-.*\.apk$/;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Reads a value from the merged release manifest (the first file under MANIFEST_DIR that carries the attribute).
function manifestAttr(attr: string): string {
  const stack = [MANIFEST_DIR];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) stack.push(abs);
      else if (name === "AndroidManifest.xml") {
        const m = readFileSync(abs, "utf8").match(new RegExp(`${attr}="(\\d+)"`));
        if (m) return m[1];
      }
    }
  }
  throw new Error(`${attr} not found under ${MANIFEST_DIR}: did the release build run?`);
}

function main(): void {
  if (!existsSync(join(WEB_ROOT, "data", "app-release.json"))) throw new Error(`Web repo not found at ${WEB_ROOT}`);

  // Never publish a debug-signed APK: testers could not update over it later. --allow-debug overrides (local testing only).
  const gradleProps = join(process.env.HOME ?? "", ".gradle", "gradle.properties");
  const hasUploadKey =
    Boolean(process.env.ACL_UPLOAD_STORE_FILE) ||
    (existsSync(gradleProps) && /^ACL_UPLOAD_STORE_FILE=\S+/m.test(readFileSync(gradleProps, "utf8")));
  if (!hasUploadKey && !process.argv.includes("--allow-debug")) {
    console.error("release:android: chưa cấu hình keystore (ACL_UPLOAD_STORE_FILE). Làm theo docs/SIGNING.md rồi chạy lại.");
    process.exit(1);
  }

  if (!existsSync(ANDROID_HOME)) throw new Error(`Android SDK not found at ${ANDROID_HOME}: set ANDROID_HOME`);

  // The APK carries the app core, so it must match the web copy.
  execFileSync(process.execPath, ["--experimental-strip-types", "scripts/sync-core.mts", "--check"], { cwd: APP_ROOT, stdio: "inherit" });

  const app = JSON.parse(readFileSync(join(APP_ROOT, "app.json"), "utf8")) as { expo: { version: string; android: { versionCode: number } } };
  const version = app.expo.version;
  const versionCode = app.expo.android.versionCode;

  execFileSync(join(ANDROID_DIR, "gradlew"), ["assembleRelease"], {
    cwd: ANDROID_DIR,
    stdio: "inherit",
    env: { ...process.env, JAVA_HOME, ANDROID_HOME },
  });
  if (!existsSync(APK_BUILD)) throw new Error(`APK not found: ${APK_BUILD}`);

  if (Number(manifestAttr("android:versionCode")) !== versionCode) throw new Error("built versionCode differs from app.json: check the build");
  const minSdk = Number(manifestAttr("android:minSdkVersion"));

  const name = `alpha-console-${version}.apk`;
  mkdirSync(DOWNLOADS, { recursive: true });
  for (const old of readdirSync(DOWNLOADS).filter((n) => APK_NAME.test(n) && n !== name)) rmSync(join(DOWNLOADS, old));
  copyFileSync(APK_BUILD, join(DOWNLOADS, name));

  const target = join(DOWNLOADS, name);
  const tag = `app-v${version}`;
  const ghArgs = ["-R", GH_REPO];
  let hasRelease = true;
  try { execFileSync("gh", ["release", "view", tag, ...ghArgs], { stdio: "ignore" }); } catch { hasRelease = false; }
  if (hasRelease) execFileSync("gh", ["release", "upload", tag, target, "--clobber", ...ghArgs], { stdio: "inherit" });
  else execFileSync("gh", ["release", "create", tag, target, "--title", `Alpha Console ${version} (Android)`, "--notes", `APK Alpha Console ${version} (versionCode ${versionCode}).`, ...ghArgs], { stdio: "inherit" });
  const release = JSON.parse(readFileSync(RELEASE_JSON, "utf8")) as Record<string, unknown>;
  release.android = {
    version,
    versionCode,
    file: `https://github.com/${GH_REPO}/releases/download/${tag}/${name}`,
    size: statSync(target).size,
    sha256: sha256File(target),
    minSdk,
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  writeFileSync(RELEASE_JSON, JSON.stringify(release, null, 2) + "\n");

  console.log(`release-android: ${name} (versionCode ${versionCode}, minSdk ${minSdk}) published; app-release.json updated`);
}

try {
  main();
} catch (e) {
  console.error(`release-android: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
