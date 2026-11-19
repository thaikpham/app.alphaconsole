/** Transfer core: planWrite and compare on the hybrid PP-on PAL fixture and the bundled sets. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compare,
  existingFamily,
  explicitPp,
  planWrite,
  TransferError,
  type CardFile,
  type CardState,
} from "../src/core/transfer/plan.ts";
import { loadHeaders } from "../src/core/bases.ts";
import { validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = path.join(ROOT, "fixtures/zve10-hybrid-ppon-pal/PRIVATE/SONY/SETTING/E10");
const fixture = (name: string): CardFile => ({ name, bytes: new Uint8Array(fs.readFileSync(path.join(FIXTURE_DIR, name))) });
const sets = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const hybrid = explicitPp(sets.find((s) => s.id === "zv-e10-hybrid")!);
const shoot = sets.find((s) => s.id === "shoot-easy")!;
const EMPTY: CardState = { sonyMarkers: true, settingFiles: [] };
const HEADER = 0x38;

test("refuses a card without Sony markers", () => {
  assert.throws(() => planWrite({ sonyMarkers: false, settingFiles: [] }, hybrid, "P"), TransferError);
});

test("family defaults to P on an empty card", () => {
  const files = planWrite(EMPTY, hybrid);
  assert.deepEqual(files.map((f) => f.relPath.split("/").pop()), ["CAMPR01P.DAT", "CAMPR02P.DAT", "CAMPR03P.DAT", "CAMPR04P.DAT"]);
  assert.ok(files.every((f) => f.relPath.startsWith("PRIVATE/SONY/SETTING/E10/")));
});

test("family N is named with N", () => {
  const files = planWrite(EMPTY, hybrid, "N");
  assert.equal(files[0].relPath.endsWith("CAMPR01N.DAT"), true);
});

test("family is taken from the card's existing files", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [fixture("CAMPR01P.DAT")] };
  assert.equal(existingFamily(card), "P");
  assert.equal(existingFamily(EMPTY), null);
  assert.equal(planWrite(card, hybrid)[3].relPath.endsWith("CAMPR04P.DAT"), true);
});

test("conflicting P and N files on the card throw", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [fixture("CAMPR01P.DAT"), { name: "CAMPR02N.DAT", bytes: new Uint8Array(4608) }] };
  assert.throws(() => existingFamily(card), TransferError);
  assert.throws(() => planWrite(card, hybrid), TransferError);
});

test("a requested family that differs from the card's family throws", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [fixture("CAMPR01P.DAT")] };
  assert.throws(() => planWrite(card, hybrid, "N"), TransferError);
  assert.throws(() => compare(card, hybrid, "N"), TransferError);
});

// ZV-E10, 2026-11-18: files carrying a camera-saved header (0x24=03) gave "file error" on recall; the bundled header recalled fine.
const CAMERA_03_DIR = path.join(ROOT, "fixtures/zve10-hang-0x315/PRIVATE/SONY/SETTING/E10");
test("header bytes 0x00-0x37 are always the bundled header, never the card's own (camera 0x24=03 header)", () => {
  const files = [1, 2, 3, 4].map((n) => ({
    name: `CAMPR0${n}P.DAT`,
    bytes: new Uint8Array(fs.readFileSync(path.join(CAMERA_03_DIR, `CAMPR0${n}P.DAT`))),
  }));
  assert.equal(files[0].bytes[0x24], 0x03);
  const out = planWrite({ sonyMarkers: true, settingFiles: files }, hybrid, "P");
  out.forEach((f, i) => assert.deepEqual(f.bytes.subarray(0, HEADER), loadHeaders("pal")[i].subarray(0, HEADER)));
});

test("planned files equal the known-good hybrid PAL set byte for byte, whatever the card holds", () => {
  const files = [1, 2, 3, 4].map((n) => ({
    name: `CAMPR0${n}P.DAT`,
    bytes: new Uint8Array(fs.readFileSync(path.join(CAMERA_03_DIR, `CAMPR0${n}P.DAT`))),
  }));
  const out = planWrite({ sonyMarkers: true, settingFiles: files }, hybrid, "P");
  out.forEach((f, i) => assert.deepEqual(f.bytes, fixture(`CAMPR0${i + 1}P.DAT`).bytes));
});

test("an unreadable card file falls back to the bundled header", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [{ name: "CAMPR01P.DAT", bytes: new Uint8Array(16) }] };
  const out = planWrite(card, hybrid, "P")[0].bytes;
  assert.deepEqual(out.subarray(0, HEADER), loadHeaders("pal")[0].subarray(0, HEADER));
});

test("compare: a missing slot counts as differing", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [fixture("CAMPR01P.DAT"), fixture("CAMPR02P.DAT"), fixture("CAMPR03P.DAT")] };
  assert.ok(compare(card, hybrid, "P").includes(4));
});

test("compare: a card already holding the planned files reports no differing slots", () => {
  const written = planWrite(EMPTY, shoot, "P");
  const card: CardState = { sonyMarkers: true, settingFiles: written.map((f) => ({ name: f.relPath.split("/").pop()!, bytes: f.bytes })) };
  assert.deepEqual(compare(card, shoot, "P"), []);
});

test("compare: the fixture against the hybrid set reports only the slots it actually changes", () => {
  const card: CardState = { sonyMarkers: true, settingFiles: [1, 2, 3, 4].map((i) => fixture(`CAMPR0${i}P.DAT`)) };
  const diff = compare(card, hybrid, "P");
  assert.ok(diff.every((s) => s >= 1 && s <= 4));
  assert.deepEqual(diff, [...new Set(diff)].sort());
});
