// Expo config plugin for the usb-volume module. Adds the USB_DEVICE_ATTACHED intent filter to MainActivity
// and a device_filter that matches only Sony (vendor ID 1356 = 0x054C). Runs at prebuild; never edit android/ by hand.
const fs = require("node:fs");
const path = require("node:path");
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

const SONY_VENDOR_ID = 1356;
const USB_ACTION = "android.hardware.usb.action.USB_DEVICE_ATTACHED";
const FILTER_RES = "@xml/device_filter";
const FILTER_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <usb-device vendor-id="${SONY_VENDOR_ID}" />
</resources>
`;

function withUsbManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);

    const filters = (activity["intent-filter"] ??= []);
    const hasFilter = filters.some((f) => (f.action ?? []).some((a) => a.$?.["android:name"] === USB_ACTION));
    if (!hasFilter) {
      filters.push({ action: [{ $: { "android:name": USB_ACTION } }] });
    }

    const metaData = (activity["meta-data"] ??= []);
    const hasMeta = metaData.some((m) => m.$?.["android:name"] === USB_ACTION);
    if (!hasMeta) {
      metaData.push({ $: { "android:name": USB_ACTION, "android:resource": FILTER_RES } });
    }
    return cfg;
  });
}

function withDeviceFilterXml(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "device_filter.xml"), FILTER_XML);
      return cfg;
    },
  ]);
}

module.exports = (config) => withDeviceFilterXml(withUsbManifest(config));
