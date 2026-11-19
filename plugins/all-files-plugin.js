// Expo config plugin for all-files access. Declares MANAGE_EXTERNAL_STORAGE so the app can read and write the camera
// card as a file path. The user grants it in system settings at runtime. Runs at prebuild; never edit android/ by hand.
const { AndroidConfig } = require("expo/config-plugins");

const ALL_FILES_PERMISSION = "android.permission.MANAGE_EXTERNAL_STORAGE";

module.exports = (config) => AndroidConfig.Permissions.withPermissions(config, [ALL_FILES_PERMISSION]);
