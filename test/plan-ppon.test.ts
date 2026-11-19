/** planWrite and compare require an explicit ppOn on every slot that has PP values (BLUEPRINT §6: PP must be set when recalled). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explicitPp, planWrite, TransferError, type CardState } from "../src/core/transfer/plan.ts";
import { decodeDat } from "../src/core/web/lib/zve10/dat.ts";
import { validatePresetSets, type PresetSet } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sets = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const bundledHybrid = sets.find((s) => s.id === "zv-e10-hybrid")!;
const shoot = sets.find((s) => s.id === "shoot-easy")!;
const EMPTY: CardState = { sonyMarkers: true, settingFiles: [] };
const PP1_SELECT = 0x315;

/** A set with the ppOn of slot 1 replaced (or removed). */
function withSlot1Ppon(set: PresetSet, ppOn: boolean | undefined): PresetSet {
  const [s1, ...rest] = set.slots;
  const settings = { ...s1.settings };
  if (ppOn === undefined) delete settings.ppOn;
  else settings.ppOn = ppOn;
  return { ...set, slots: [{ ...s1, settings }, ...rest] as PresetSet["slots"] };
}

test("planWrite refuses a PP slot without ppOn, and names the slot", () => {
  assert.throws(() => planWrite(EMPTY, bundledHybrid, "P"), (e: unknown) => e instanceof TransferError && /M1: thiếu ppOn/.test(String(e)));
});

test("explicitPp sets ppOn true only on slots with PP values and no ppOn", () => {
  const filled = explicitPp(bundledHybrid);
  assert.ok(filled.slots.every((s) => s.settings.ppOn === true));
  const shootFilled = explicitPp(shoot);
  assert.deepEqual(shootFilled.slots.map((s) => s.settings.ppOn), shoot.slots.map((s) => s.settings.ppOn));
  const off = withSlot1Ppon(bundledHybrid, false);
  assert.equal(explicitPp(off).slots[0].settings.ppOn, false);
});

test("explicit ppOn true selects PP1 in every file", () => {
  const files = planWrite(EMPTY, explicitPp(bundledHybrid), "P");
  for (const f of files) assert.equal(decodeDat(f.bytes).pp_selected, 1, f.relPath);
});

test("a slot without PP values does not need ppOn", () => {
  const files = planWrite(EMPTY, shoot, "P");
  assert.equal(files.length, 4);
  for (const f of files) assert.equal(f.bytes[PP1_SELECT], 0, f.relPath);
});

test("explicit ppOn false with PP values is refused by the core", () => {
  assert.throws(() => planWrite(EMPTY, withSlot1Ppon(explicitPp(bundledHybrid), false), "P"), /Tắt Picture Profile/);
});

test("explicit ppOn false without PP values turns PP off", () => {
  const set = withSlot1Ppon(shoot, false);
  const files = planWrite(EMPTY, set, "P");
  assert.equal(files[0].bytes[PP1_SELECT], 0);
});
