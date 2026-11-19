/**
 * Preview readings and slot matching. The M1 fixture is the property list of a ZV-E10 after recalling M1 of Hybrid
 * (test/fixtures/ptp/allprops-m1.json, from the spike capture). It must match slot 1 of the bundled zv-e10-hybrid set.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePresetSets, type SlotDraft } from "../src/core/web/lib/presetSets.ts";
import { formatCells, readPreview, type PreviewLabels, type PtpProp } from "../src/core/preview/props.ts";
import { matchSlot, type SlotSource } from "../src/core/preview/match.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundled = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const hybrid = bundled.find((s) => s.id === "zv-e10-hybrid");
if (!hybrid) throw new Error("bundled zv-e10-hybrid is missing");
const M1 = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/ptp/allprops-m1.json"), "utf8")).props as PtpProp[];

const LABELS: PreviewLabels = {
  wb: { awb: "AWB", daylight: "Ban ngày", incandescent: "Sợi đốt", cloudy: "Mây", shade: "Bóng râm" },
  focus: { MF: "MF", "AF-S": "AF-S", "AF-C": "AF-C" },
  metering: { multi: "Đa vùng" },
  ppOff: "Tắt",
};

function withProp(props: PtpProp[], code: number, current: number): PtpProp[] {
  return props.map((p) => (p.code === code ? { ...p, current } : p));
}

function withoutProp(props: PtpProp[], code: number): PtpProp[] {
  return props.filter((p) => p.code !== code);
}

/** Slot settings in order, for any number of slots. */
const withSlots = (settings: SlotDraft[]): SlotSource => ({
  slots: settings.map((s, i) => ({ label: `S${i + 1}`, settings: s })),
});

describe("readPreview on the M1 capture", () => {
  test("maps each mapped code to its value", () => {
    assert.deepEqual(readPreview(M1), {
      mode: { kind: "value", value: "A" },
      aperture: { kind: "value", value: "4.5" },
      shutter: { kind: "value", value: "1/30" },
      iso: { kind: "value", value: "AUTO" },
      wb: { kind: "value", value: "awb" },
      kelvin: { kind: "value", value: 5000 },
      focus: { kind: "value", value: "AF-C" },
      metering: { kind: "value", value: "multi" },
      pp: { kind: "value", value: 1 },
    });
  });

  test("formats the compact row cells", () => {
    const cells = formatCells(readPreview(M1), LABELS);
    assert.equal(cells.mode, "A");
    assert.equal(cells.aperture, "F4.5");
    assert.equal(cells.shutter, "1/30");
    assert.equal(cells.iso, "ISO AUTO");
    assert.equal(cells.wb, "AWB");
    assert.equal(cells.pp, "PP1");
    assert.equal(cells.focus, "AF-C");
    assert.equal(cells.metering, "Đa vùng");
  });
});

describe("matchSlot on the M1 capture", () => {
  test("slot 1 of Hybrid matches, on the six fields the slot sets", () => {
    const r = matchSlot(M1, hybrid);
    assert.equal(r.matched, 0);
    assert.equal(r.nearest, 0);
    assert.deepEqual(r.slots[0].fields, {
      mode: "match",
      iso: "match",
      wb: "match",
      focus: "match",
      metering: "match",
      pp: "match",
    });
    assert.equal(r.slots[0].compared, 6);
    assert.equal(r.slots[0].mismatches, 0);
  });

  test("all four slots are checked", () => {
    assert.equal(matchSlot(M1, hybrid).slots.length, 4);
  });
});

describe("unknown, missing and keep values", () => {
  test("an unknown exposure program is raw and never matches", () => {
    const props = withProp(M1, 0x500e, 9);
    assert.deepEqual(readPreview(props).mode, { kind: "raw", raw: 9 });
    assert.equal(formatCells(readPreview(props), LABELS).mode, "0x9");
    const r = matchSlot(props, hybrid);
    assert.equal(r.slots[0].fields.mode, "mismatch");
    assert.equal(r.matched, null);
  });

  test("a missing property never matches", () => {
    const props = withoutProp(M1, 0x5005);
    assert.deepEqual(readPreview(props).wb, { kind: "missing" });
    assert.equal(matchSlot(props, hybrid).slots[0].fields.wb, "mismatch");
  });

  test("an unmapped metering code is raw", () => {
    const props = withProp(M1, 0x500b, 0x8002);
    assert.deepEqual(readPreview(props).metering, { kind: "raw", raw: 0x8002 });
  });

  test("an unknown ISO value is raw", () => {
    const props = withProp(M1, 0xd21e, 12345);
    assert.deepEqual(readPreview(props).iso, { kind: "raw", raw: 12345 });
    assert.equal(matchSlot(props, hybrid).slots[0].fields.iso, "mismatch");
  });

  test("an unknown shutter code is raw", () => {
    const props = withProp(M1, 0xd20d, 0x00070003);
    assert.deepEqual(readPreview(props).shutter, { kind: "raw", raw: 0x00070003 });
  });

  test("an aperture off the list is raw", () => {
    const props = withProp(M1, 0x5007, 451);
    assert.deepEqual(readPreview(props).aperture, { kind: "raw", raw: 451 });
  });

  test("a picture profile above 10 is raw and never matches", () => {
    const props = withProp(M1, 0xd23f, 11);
    assert.deepEqual(readPreview(props).pp, { kind: "raw", raw: 11 });
    assert.equal(matchSlot(props, hybrid).slots[0].fields.pp, "mismatch");
  });

  test("a keep field is skipped", () => {
    const r = matchSlot(M1, withSlots([{ mode: "keep", focus: "AF-C" }]));
    assert.deepEqual(r.slots[0].fields, { focus: "match" });
    assert.equal(r.slots[0].compared, 1);
    assert.equal(r.matched, 0);
  });

  test("a slot with no compared field cannot match", () => {
    const r = matchSlot(M1, withSlots([{}, { mode: "keep" }]));
    assert.equal(r.matched, null);
    assert.equal(r.nearest, null);
    assert.equal(r.slots[0].compared, 0);
  });
});

describe("field comparisons", () => {
  test("a ctemp slot matches on kelvin", () => {
    const props = withProp(M1, 0x5005, 0x8012);
    assert.equal(matchSlot(props, withSlots([{ wb: { mode: "ctemp", kelvin: 5000 } }])).slots[0].fields.wb, "match");
    assert.equal(matchSlot(props, withSlots([{ wb: { mode: "ctemp", kelvin: 3200 } }])).slots[0].fields.wb, "mismatch");
  });

  test("an awb slot does not match daylight", () => {
    const props = withProp(M1, 0x5005, 0x0004);
    assert.deepEqual(readPreview(props).wb, { kind: "value", value: "daylight" });
    assert.equal(matchSlot(props, hybrid).slots[0].fields.wb, "mismatch");
  });

  test("ppOn false matches PP off, and PP2 is a mismatch", () => {
    assert.equal(matchSlot(withProp(M1, 0xd23f, 0), withSlots([{ ppOn: false }])).slots[0].fields.pp, "match");
    assert.equal(matchSlot(withProp(M1, 0xd23f, 2), withSlots([{ ppOn: false }])).slots[0].fields.pp, "mismatch");
    assert.equal(matchSlot(withProp(M1, 0xd23f, 2), withSlots([{ ppOn: true }])).slots[0].fields.pp, "mismatch");
    assert.equal(matchSlot(M1, withSlots([{ ppOn: true }])).slots[0].fields.pp, "match");
  });

  test("a pp record without ppOn selects PP1, and an empty record is skipped", () => {
    assert.equal(matchSlot(M1, withSlots([{ pp: { gamma: "Still" } }])).slots[0].fields.pp, "match");
    assert.equal(matchSlot(withProp(M1, 0xd23f, 0), withSlots([{ pp: { gamma: "Still" } }])).slots[0].fields.pp, "mismatch");
    assert.equal(matchSlot(M1, withSlots([{ pp: {} }])).slots[0].fields.pp, undefined);
  });

  test("an ISO number matches a numeric or string slot value", () => {
    const props = withProp(M1, 0xd21e, 400);
    assert.deepEqual(readPreview(props).iso, { kind: "value", value: "400" });
    assert.equal(matchSlot(props, withSlots([{ iso: 400 }])).slots[0].fields.iso, "match");
    assert.equal(matchSlot(props, withSlots([{ iso: "400" }])).slots[0].fields.iso, "match");
    assert.equal(matchSlot(props, withSlots([{ iso: "auto" }])).slots[0].fields.iso, "mismatch");
  });

  test("a shutter slot matches the decoded speed", () => {
    assert.equal(matchSlot(M1, withSlots([{ shutter: "1/30" }])).slots[0].fields.shutter, "match");
    assert.equal(matchSlot(M1, withSlots([{ shutter: "1/60" }])).slots[0].fields.shutter, "mismatch");
  });
});

describe("matched and nearest", () => {
  test("a single mismatch leaves matched null and nearest on that slot", () => {
    const r = matchSlot(M1, withSlots([{ wb: { mode: "ctemp", kelvin: 3200 } }]));
    assert.equal(r.matched, null);
    assert.equal(r.nearest, 0);
    assert.equal(r.slots[0].mismatches, 1);
  });

  test("nearest is the slot with fewest mismatches, lowest index on ties", () => {
    const r = matchSlot(
      M1,
      withSlots([
        { mode: "P", focus: "AF-S" },
        { focus: "AF-S" },
        { mode: "A", metering: "center" },
        { focus: "AF-S", metering: "center" },
      ]),
    );
    assert.equal(r.matched, null);
    assert.equal(r.nearest, 1);
  });

  test("matched is the lowest index among exact matches", () => {
    const r = matchSlot(M1, withSlots([{ focus: "AF-S" }, { mode: "A" }, { focus: "AF-C" }, { mode: "A", focus: "AF-C" }]));
    assert.equal(r.matched, 1);
    assert.equal(r.nearest, 1);
  });
});
