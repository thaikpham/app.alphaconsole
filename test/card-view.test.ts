/** Card view: describeCard and toCardState on the hybrid PP-on PAL fixture, a card written from a bundled set, and broken cards. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeCard, toCardState, type InspectedCard } from "../src/core/card/view.ts";
import { planWrite, type CardFile, type CardState } from "../src/core/transfer/plan.ts";
import { bytesToBase64 } from "../src/core/bases.ts";
import { listedSets, validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = path.join(ROOT, "fixtures/zve10-hybrid-ppon-pal/PRIVATE/SONY/SETTING/E10");
const fixture = (name: string): CardFile => ({ name, bytes: new Uint8Array(fs.readFileSync(path.join(FIXTURE_DIR, name))) });
const sets = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const shoot = sets.find((s) => s.id === "shoot-easy")!;
const listed = listedSets(sets);
const PAL_FILES = ["CAMPR01P.DAT", "CAMPR02P.DAT", "CAMPR03P.DAT", "CAMPR04P.DAT"].map(fixture);
const palCard = (): CardState => ({ sonyMarkers: true, settingFiles: PAL_FILES });

test("PAL fixture: family P, four readable slots, slot 1 is mode A, AWB, PP on", () => {
  const view = describeCard(palCard(), listed);
  assert.equal(view.error, null);
  assert.equal(view.family, "P");
  assert.equal(view.slots.length, 4);
  assert.ok(view.slots.every((s) => s.readable));
  assert.deepEqual(view.slots[0], { slot: 1, readable: true, mode: "A", wb: "AWB", ppOn: true, focus: "AF-C", label: "Đời thường" });
});

test("PAL fixture: slot 2 shows its Kelvin white balance and the matching listed label", () => {
  const slot2 = describeCard(palCard(), listed).slots[1];
  assert.equal(slot2.wb, "6200K");
  assert.equal(slot2.label, "Chân dung");
});

test("labels come only from the sets passed in", () => {
  const card = { sonyMarkers: true, settingFiles: planWrite({ sonyMarkers: true, settingFiles: [] }, shoot, "P").map((f) => ({ name: f.relPath.split("/").pop()!, bytes: f.bytes })) };
  assert.deepEqual(describeCard(card, listed).slots.map((s) => s.label), [null, null, null, null]);
  assert.deepEqual(describeCard(card, sets).slots.map((s) => s.label), ["Hằng ngày", "Hằng ngày", "Hằng ngày", "Hằng ngày"]);
});

test("empty card: no family, no slots, no error", () => {
  assert.deepEqual(describeCard({ sonyMarkers: true, settingFiles: [] }, listed), { family: null, slots: [], error: null });
});

test("missing slot file: that slot is unreadable with no label, the others are unaffected", () => {
  const card = { sonyMarkers: true, settingFiles: PAL_FILES.filter((f) => f.name !== "CAMPR02P.DAT") };
  const view = describeCard(card, listed);
  assert.equal(view.family, "P");
  assert.deepEqual(view.slots[1], { slot: 2, readable: false, mode: null, wb: null, ppOn: null, focus: null, label: null });
  assert.equal(view.slots[0].readable, true);
  assert.equal(view.slots[2].label, "Livestream");
});

test("garbage bytes in a slot file: that slot is unreadable", () => {
  const junk = new Uint8Array(4608).fill(0x41);
  const card = { sonyMarkers: true, settingFiles: [PAL_FILES[0], { name: "CAMPR02P.DAT", bytes: junk }, PAL_FILES[2], PAL_FILES[3]] };
  const view = describeCard(card, listed);
  assert.equal(view.slots[1].readable, false);
  assert.equal(view.slots[0].readable, true);
});

test("PAL and NTSC files together: error, no slots", () => {
  const card = { sonyMarkers: true, settingFiles: [...PAL_FILES, { name: "CAMPR01N.DAT", bytes: PAL_FILES[0].bytes }] };
  const view = describeCard(card, listed);
  assert.equal(view.family, null);
  assert.deepEqual(view.slots, []);
  assert.ok(view.error && view.error.length > 0);
});

test("toCardState decodes base64 inspection files back to the same bytes", () => {
  const input: InspectedCard = {
    sonyCard: true,
    settingDir: true,
    files: PAL_FILES.map((f) => ({ name: f.name, base64: bytesToBase64(f.bytes) })),
  };
  const state = toCardState(input);
  assert.equal(state.sonyMarkers, true);
  assert.deepEqual(state.settingFiles.map((f) => f.name), PAL_FILES.map((f) => f.name));
  state.settingFiles.forEach((f, i) => assert.deepEqual(f.bytes, PAL_FILES[i].bytes));
  assert.deepEqual(describeCard(state, listed), describeCard(palCard(), listed));
});
