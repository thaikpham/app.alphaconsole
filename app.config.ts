// Extends app.json (the base config) with web-only export settings. Native config is passed through unchanged.
import type { ConfigContext } from "expo/config";

export default ({ config }: ConfigContext) => ({
  ...config,
  web: { output: "single", bundler: "metro" },
  experiments: {
    ...config.experiments,
    // "/console-app" when exported into the WEB site; empty for a root-hosted build.
    baseUrl: process.env.EXPO_BASE_URL ?? "",
  },
});
