/** Mismatch line for the preview screen: camera readback against one slot. Fixtures are PTP values decoded by readPreview. Pure helper: src/write/mismatch.ts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchSlot } from "../src/core/web/lib/app-core/preview/match.ts";
import { PROP, readPreview, type PreviewLabels, type PtpProp } from "../src/core/web/lib/app-core/preview/props.ts";
import type { SlotDraft } from "../src/core/web/lib/presetSets.ts";
import { mismatchSummary } from "../src/write/mismatch.ts";

const labels: PreviewLabels = {
  wb: { awb: "AWB", daylight: "Ban ngày", incandescent: "Đèn sợi đốt", cloudy: "Mây", shade: "Bóng râm" },
  focus: { MF: "MF", "AF-S": "AF-S", "AF-C": "AF-C" },
  metering: { multi: "Đa điểm" },
  ppOff: "Tắt",
};

const prop = (code: number, current: number): PtpProp => ({ code, dataType: 0, getSet: 1, isEnabled: 1, current });

// The camera: P, F4.5, 1/60, ISO 400, AWB, AF-C, multi metering, PP off.
const camera: PtpProp[] = [
  prop(PROP.exposureProgram, 2),
  prop(PROP.fNumber, 450),
  prop(PROP.shutter, (1 << 16) | 60),
  prop(PROP.iso, 400),
  prop(PROP.whiteBalance, 0x0002),
  prop(PROP.focus, 0x8004),
  prop(PROP.metering, 0x8001),
  prop(PROP.pictureProfile, 0),
];

function summary(slot: SlotDraft, props: readonly PtpProp[] = camera): string | null {
  const readings = readPreview(props);
  const check = matchSlot(props, { slots: [{ settings: slot }] }).slots[0];
  return mismatchSummary(readings, slot, check, labels);
}

test("a slot the camera matches has no summary", () => {
  const slot: SlotDraft = {
    mode: "P",
    aperture: 4.5,
    shutter: "1/60",
    iso: 400,
    wb: { mode: "awb" },
    focus: "AF-C",
    metering: "multi",
    ppOn: false,
  };
  assert.equal(summary(slot), null);
});

test("each differing field is listed as readback → slot, in field order", () => {
  const slot: SlotDraft = { mode: "P", aperture: 5.6, iso: 800, ppOn: true };
  assert.equal(summary(slot), "F4.5 → F5.6 · ISO 400 → ISO 800 · Tắt → PP1");
});

test("only the fields the slot sets are listed", () => {
  assert.equal(summary({ iso: 800 }), "ISO 400 → ISO 800");
  assert.equal(summary({ aperture: "keep", iso: 800 }), "ISO 400 → ISO 800");
});

test("an unreadable camera value shows a dash", () => {
  const withoutAperture = camera.filter((p) => p.code !== PROP.fNumber);
  assert.equal(summary({ aperture: 4.5 }, withoutAperture), "— → F4.5");
});

test("auto ISO and a colour temperature are written as on the screen", () => {
  assert.equal(summary({ iso: "auto" }), "ISO 400 → ISO AUTO");
  assert.equal(summary({ wb: { mode: "ctemp", kelvin: 5600 } }), "AWB → 5600K");
});
