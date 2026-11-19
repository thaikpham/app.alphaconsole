// Expo config plugin: release signing with the owner's upload keystore.
// Keys are read at Gradle time from ~/.gradle/gradle.properties or the environment. No secret is written to the repo.
// If any key is missing, release falls back to the debug key and Gradle prints a warning. See docs/SIGNING.md.
// Runs at prebuild; never edit android/ by hand.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARK = "// acl-signing";

const HELPERS = `${MARK}: upload keystore from ~/.gradle/gradle.properties or env (docs/SIGNING.md)
def aclSigningValue = { String key ->
    def value = project.findProperty(key) ?: System.getenv(key)
    return value ? value.toString() : null
}
def aclStoreFile = aclSigningValue("ACL_UPLOAD_STORE_FILE")?.replaceFirst("^~", System.getProperty("user.home"))
def aclKeyAlias = aclSigningValue("ACL_UPLOAD_KEY_ALIAS")
def aclStorePassword = aclSigningValue("ACL_UPLOAD_STORE_PASSWORD")
def aclKeyPassword = aclSigningValue("ACL_UPLOAD_KEY_PASSWORD")
def aclHasUploadKey = aclStoreFile && aclKeyAlias && aclStorePassword && aclKeyPassword
if (!aclHasUploadKey) {
    logger.warn("ACL WARNING: upload keystore not configured (ACL_UPLOAD_STORE_FILE, ACL_UPLOAD_KEY_ALIAS, ACL_UPLOAD_STORE_PASSWORD, ACL_UPLOAD_KEY_PASSWORD). Release APK is signed with the DEBUG key. See docs/SIGNING.md.")
}

`;

const RELEASE_SIGNING = `        if (aclHasUploadKey) {
            release {
                storeFile file(aclStoreFile)
                storePassword aclStorePassword
                keyAlias aclKeyAlias
                keyPassword aclKeyPassword
            }
        }
`;

const DEBUG_RELEASE_LINE = "signingConfig signingConfigs.debug";
const RELEASE_LINE = "signingConfig(aclHasUploadKey ? signingConfigs.release : signingConfigs.debug)";

function countOf(src, needle) {
  return src.split(needle).length - 1;
}

function requireOnce(src, needle) {
  if (countOf(src, needle) !== 1) {
    throw new Error(`signing-plugin: expected exactly one "${needle}" in android/app/build.gradle; the template changed`);
  }
}

function applySigning(src) {
  if (src.includes(MARK)) return src;
  requireOnce(src, "\nandroid {\n");
  requireOnce(src, "\n    signingConfigs {\n");

  // The debug buildType also uses the debug key, so only the line inside release {} is changed.
  const releaseAt = src.indexOf("\n        release {\n");
  const lineAt = releaseAt < 0 ? -1 : src.indexOf(DEBUG_RELEASE_LINE, releaseAt);
  if (lineAt < 0) {
    throw new Error("signing-plugin: release buildType signingConfig not found in android/app/build.gradle");
  }
  const withRelease = src.slice(0, lineAt) + RELEASE_LINE + src.slice(lineAt + DEBUG_RELEASE_LINE.length);

  return withRelease
    .replace("\nandroid {\n", `\n${HELPERS}android {\n`)
    .replace("\n    signingConfigs {\n", `\n    signingConfigs {\n${RELEASE_SIGNING}`);
}

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("signing-plugin: expected Groovy android/app/build.gradle");
    }
    cfg.modResults.contents = applySigning(cfg.modResults.contents);
    return cfg;
  });
