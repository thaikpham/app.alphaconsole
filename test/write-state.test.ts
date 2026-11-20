/** Overwrite detection, write records, family choice, and the state file. Fixtures: the camera-overwritten M2 and the hybrid PP-on PAL files. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explicitPp, planWrite, type CardFile, type CardState } from "../src/core/web/lib/app-core/transfer/plan.ts";
import {
  chooseFamily,
  latestWriteRecord,
  newBackupId,
  overwrittenSlots,
  parseWriteState,
  recordFor,
  recordHolds,
  serializeWriteState,
  StateError,
  type WriteRecord,
  type WriteState,
} from "../src/core/web/lib/app-core/transfer/state.ts";
import { sha256Hex } from "../src/core/web/lib/app-core/transfer/sha256.ts";
import { validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = path.join(ROOT, "fixtures/zve10-hybrid-ppon-pal/PRIVATE/SONY/SETTING/E10");
const OVERWRITTEN = path.join(ROOT, "test/fixtures/camera-overwritten-m2/CAMPR02P.DAT");
const fixture = (name: string): CardFile => ({ name, bytes: new Uint8Array(fs.readFileSync(path.join(FIXTURE_DIR, name))) });
const sets = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const hybrid = explicitPp(sets.find((s) => s.id === "zv-e10-hybrid")!);
const NAMES = ["CAMPR01P.DAT", "CAMPR02P.DAT", "CAMPR03P.DAT", "CAMPR04P.DAT"];
const DATE = "2026-11-18T09:00:00.000Z";

/** Record of the fixture files, as if the app had written them. */
function fixtureRecord(): WriteRecord {
  const planned = NAMES.map((name) => ({ relPath: `PRIVATE/SONY/SETTING/E10/${name}`, bytes: fixture(name).bytes }));
  return recordFor("zv-e10-hybrid", planned, "P", DATE);
}

test("overwrite: the camera-overwritten M2 is flagged, the other slots are not", () => {
  const card: CardState = {
    sonyMarkers: true,
    settingFiles: [fixture("CAMPR01P.DAT"), { name: "CAMPR02P.DAT", bytes: new Uint8Array(fs.readFileSync(OVERWRITTEN)) }, fixture("CAMPR03P.DAT"), fixture("CAMPR04P.DAT")],
  };
  assert.deepEqual(overwrittenSlots(card, fixtureRecord()), [2]);
});

test("overwrite: the untouched fixture card reports nothing", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: NAMES.map(fixture) };
  assert.deepEqual(overwrittenSlots(card, fixtureRecord()), []);
});

test("overwrite: a missing file counts as changed", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [fixture("CAMPR01P.DAT"), fixture("CAMPR02P.DAT"), fixture("CAMPR04P.DAT")] };
  assert.deepEqual(overwrittenSlots(card, fixtureRecord()), [3]);
});

test("overwrite: a card with no CAMPR files, or another family, reports nothing", () => {
  assert.deepEqual(overwrittenSlots({ sonyMarkers: true, settingFiles: [] }, fixtureRecord()), []);
  const nts = NAMES.map((n) => ({ name: n.replace("P.DAT", "N.DAT"), bytes: fixture(n).bytes }));
  assert.deepEqual(overwrittenSlots({ sonyMarkers: true, settingFiles: nts }, fixtureRecord()), []);
});

test("overwrite: files the app planned and wrote are not flagged, a one-byte change is", () => {
  const planned = planWrite({ sonyMarkers: true, settingFiles: [] }, hybrid, "P");
  const record = recordFor("zv-e10-hybrid", planned, "P", DATE);
  const same: CardState = { sonyMarkers: true, settingFiles: planned.map((f) => ({ name: f.relPath.split("/").pop()!, bytes: f.bytes })) };
  assert.deepEqual(overwrittenSlots(same, record), []);
  const bytes = new Uint8Array(planned[3].bytes);
  bytes[0x315] ^= 1;
  const changed: CardState = { sonyMarkers: true, settingFiles: [...same.settingFiles.slice(0, 3), { name: "CAMPR04P.DAT", bytes }] };
  assert.deepEqual(overwrittenSlots(changed, record), [4]);
});

test("recordHolds: the card holds the record only while every planned file is there, in the same family", () => {
  const record = fixtureRecord();
  assert.equal(recordHolds({ sonyMarkers: true, settingFiles: NAMES.map(fixture) }, record), true);
  assert.equal(recordHolds({ sonyMarkers: true, settingFiles: [] }, record), false);
  const m2 = [fixture("CAMPR01P.DAT"), { name: "CAMPR02P.DAT", bytes: new Uint8Array(fs.readFileSync(OVERWRITTEN)) }, fixture("CAMPR03P.DAT"), fixture("CAMPR04P.DAT")];
  assert.equal(recordHolds({ sonyMarkers: true, settingFiles: m2 }, record), false);
  const nts = NAMES.map((n) => ({ name: n.replace("P.DAT", "N.DAT"), bytes: fixture(n).bytes }));
  assert.equal(recordHolds({ sonyMarkers: true, settingFiles: nts }, record), false);
  assert.equal(recordHolds({ sonyMarkers: true, settingFiles: [fixture("CAMPR01P.DAT"), nts[1]] }, record), false);
});

test("recordFor: sha256 per file matches the bytes, and names follow the family", () => {
  const planned = NAMES.map((name) => ({ relPath: `PRIVATE/SONY/SETTING/E10/${name}`, bytes: fixture(name).bytes }));
  const record = recordFor("x", planned, "P", DATE);
  assert.deepEqual(record.files.map((f) => f.name), NAMES);
  assert.equal(record.files[1].sha256, sha256Hex(fixture("CAMPR02P.DAT").bytes));
  assert.throws(() => recordFor("x", planned.slice(0, 3), "P", DATE), StateError);
  assert.throws(() => recordFor("x", planned, "N", DATE), StateError);
});

test("chooseFamily: the card wins, then the remembered family, then ask with PAL", () => {
  assert.deepEqual(chooseFamily("N", "P"), { family: "N", ask: false });
  assert.deepEqual(chooseFamily(null, "N"), { family: "N", ask: false });
  assert.deepEqual(chooseFamily(null, undefined), { family: "P", ask: true });
  assert.deepEqual(chooseFamily("P", undefined), { family: "P", ask: false });
});

test("state: a missing file is the empty state; a round trip keeps records, families and pending writes", () => {
  assert.deepEqual(parseWriteState(null), { families: {}, lastWritten: {}, pending: {} });
  const state: WriteState = {
    families: { "abcd-1234": "N" },
    lastWritten: { "abcd-1234": fixtureRecord() },
    pending: { "abcd-1234": { backupId: "20261118-090000", setId: "zv-e10-hybrid", startedAt: DATE } },
  };
  assert.deepEqual(parseWriteState(serializeWriteState(state)), state);
});

test("state: corrupt text is refused, not reset", () => {
  assert.throws(() => parseWriteState("{not json"), StateError);
  assert.throws(() => parseWriteState(JSON.stringify({ version: 2, families: {} })), StateError);
  assert.throws(() => parseWriteState(JSON.stringify({ version: 1, families: { u: "X" } })), StateError);
  const bad = JSON.parse(serializeWriteState({ families: {}, lastWritten: { u: fixtureRecord() }, pending: {} }));
  bad.lastWritten.u.files[1].sha256 = "zz";
  assert.throws(() => parseWriteState(JSON.stringify(bad)), StateError);
  const wrongName = JSON.parse(serializeWriteState({ families: {}, lastWritten: { u: fixtureRecord() }, pending: {} }));
  wrongName.lastWritten.u.files[0].name = "CAMPR01N.DAT";
  assert.throws(() => parseWriteState(JSON.stringify(wrongName)), StateError);
});

test("latest: the newest write across cards wins, compared by time, not by text", () => {
  assert.equal(latestWriteRecord({}), null);
  const older = { ...fixtureRecord(), setId: "older", date: "2026-11-17T09:00:00.000Z" };
  const newer = { ...fixtureRecord(), setId: "newer", date: "2026-11-18T08:00:00.000Z" };
  assert.equal(latestWriteRecord({ a: older, b: newer })?.setId, "newer");
  assert.equal(latestWriteRecord({ b: newer, a: older })?.setId, "newer");
  // 09:00 at +02:00 is 07:00Z, before 08:00Z, although its text sorts after.
  const offset = { ...fixtureRecord(), setId: "offset", date: "2026-11-18T09:00:00.000+02:00" };
  assert.equal(latestWriteRecord({ a: offset, b: newer })?.setId, "newer");
});

test("backup id: local time, fixed width, the shape the native layer accepts", () => {
  assert.equal(newBackupId(new Date(2026, 10, 18, 9, 0, 0, 7)), "20261118-090000-007");
  assert.match(newBackupId(new Date()), /^\d{8}-\d{6}-\d{3}$/);
});
