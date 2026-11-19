// Expo config plugin: Android builds arm64-v8a only. Sets reactNativeArchitectures in gradle.properties at prebuild.
// Runs at prebuild; never edit android/ by hand.
const { withGradleProperties } = require("expo/config-plugins");

const KEY = "reactNativeArchitectures";
const VALUE = "arm64-v8a";

module.exports = (config) =>
  withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.find((p) => p.type === "property" && p.key === KEY);
    if (existing) existing.value = VALUE;
    else props.push({ type: "property", key: KEY, value: VALUE });
    return cfg;
  });
