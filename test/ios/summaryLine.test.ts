/** iOS preview settings line (SPEC-IOS §4.9, O19): camera readback in one row, mismatches as readback→slot. Pure helper: src/ui/summaryLine.ts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchSlot } from "../../src/core/preview/match.ts";
import { PROP, readPreview, type PreviewLabels, type PtpProp } from "../../src/core/preview/props.ts";
import type { SlotDraft } from "../../src/core/web/lib/presetSets.ts";
import { settingsLine, type SummarySegment } from "../../src/ui/summaryLine.ts";

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

function line(props: readonly PtpProp[], slot: SlotDraft | null = null): SummarySegment[] {
  const check = slot ? matchSlot(props, { slots: [{ settings: slot }] }).slots[0] : null;
  return settingsLine(readPreview(props), labels, slot, check);
}

const texts = (segments: SummarySegment[]) => segments.map((s) => s.text);
const flagged = (segments: SummarySegment[]) => segments.filter((s) => s.warn).map((s) => s.text);

test("the camera's six values read in settings-line order", () => {
  assert.deepEqual(texts(line(camera)), ["P", "f/4.5", "1/60", "ISO 400", "AWB", "Tắt"]);
  assert.deepEqual(flagged(line(camera)), []);
});

test("a slot the camera matches flags nothing", () => {
  const slot: SlotDraft = { mode: "P", aperture: 4.5, shutter: "1/60", iso: 400, wb: { mode: "awb" }, ppOn: false };
  assert.deepEqual(flagged(line(camera, slot)), []);
});

test("each differing value reads readback→slot and is flagged; the rest stay plain", () => {
  const slot: SlotDraft = { mode: "P", aperture: 5.6, shutter: "1/125", iso: 800, ppOn: true };
  const segments = line(camera, slot);
  assert.deepEqual(texts(segments), ["P", "f/4.5→f/5.6", "1/60→1/125", "ISO 400→ISO 800", "AWB", "Tắt→PP1"]);
  assert.deepEqual(
    segments.map((s) => s.warn),
    [false, true, true, true, false, true],
  );
});

test("auto ISO reads Auto", () => {
  const props = camera.map((p) => (p.code === PROP.iso ? prop(PROP.iso, 0x00ffffff) : p));
  assert.equal(texts(line(props))[3], "ISO Auto");
});

test("an unreadable camera value shows its raw code, a missing one a dash", () => {
  const props = camera.map((p) => (p.code === PROP.fNumber ? prop(PROP.fNumber, 999) : p)).filter((p) => p.code !== PROP.shutter);
  assert.deepEqual(texts(line(props)), ["P", "0x3E7", "—", "ISO 400", "AWB", "Tắt"]);
});

test("no props gives six dashes and nothing flagged", () => {
  const segments = line([]);
  assert.deepEqual(texts(segments), ["—", "—", "—", "—", "—", "—"]);
  assert.deepEqual(flagged(segments), []);
});
