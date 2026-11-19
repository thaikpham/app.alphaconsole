/**
 * Regression for the JS thread stalling at 100% CPU after a cold start with the 0x315 card mounted. The fixture is that
 * card's four CAMPR files and its MEDIAPRO.XML. Every read has to finish, and a read with many user sets has to stay
 * inside a time budget. Before the compare cache, the cost grew by about 1 s per listed set.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeCard, toCardState, type InspectedCard } from "../src/core/card/view.ts";
import { matchingSet } from "../src/core/sets/match.ts";
import { compare, explicitPp, planWrite, type CardFile, type CardState, type PlannedFile } from "../src/core/transfer/plan.ts";
import { overwrittenSlots, recordFor, recordHolds } from "../src/core/transfer/state.ts";
import { listedSets, validatePresetSets, type PresetSet } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARD_DIR = path.join(ROOT, "fixtures/zve10-hang-0x315");
const SETTING_DIR = path.join(CARD_DIR, "PRIVATE/SONY/SETTING/E10");
const SETTING_NAMES = ["CAMPR01P.DAT", "CAMPR02P.DAT", "CAMPR03P.DAT", "CAMPR04P.DAT"];
const BUDGET_MS = 5000;
const WRITTEN_AT = "2026-11-18T00:00:00.000Z";

const bundled = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const shoot = bundled.find((s) => s.id === "shoot-easy")!;
const listed = listedSets(bundled);

const inspected = (extra: { name: string; base64: string }[] = []): InspectedCard => ({
  sonyCard: true,
  settingDir: true,
  files: [
    ...SETTING_NAMES.map((name) => ({ name, base64: fs.readFileSync(path.join(SETTING_DIR, name)).toString("base64") })),
    ...extra,
  ],
});
const hangCard = (): CardState => toCardState(inspected());

/** Ten user sets, each a copy of the shoot-easy settings under its own id, as the set store would hold them. */
const userSets = (count: number): PresetSet[] =>
  validatePresetSets(
    Array.from({ length: count }, (_, i) => ({
      id: `user-${i + 1}`,
      name: `Bộ của tôi ${i + 1}`,
      description: "Bộ thử nghiệm",
      slots: structuredClone(shoot.slots),
    })),
  );

/** Same test as recover() in src/card/session.ts: every planned file is on the card, byte for byte. */
function onCard(planned: PlannedFile[], state: CardState): boolean {
  return planned.every((p) => {
    const name = p.relPath.split("/").pop();
    const file = state.settingFiles.find((f) => f.name === name);
    return file !== undefined && Buffer.compare(file.bytes, p.bytes) === 0;
  });
}

/** The card as it is after the planned files were written onto it. */
function written(planned: PlannedFile[]): CardState {
  return {
    sonyMarkers: true,
    settingFiles: planned.map((p): CardFile => ({ name: p.relPath.split("/").pop()!, bytes: p.bytes })),
  };
}

test("0x315 card: toCardState, describeCard, matchingSet and overwrittenSlots finish; four readable P slots, no match", () => {
  const state = hangCard();
  const view = describeCard(state, listed);
  assert.equal(view.error, null);
  assert.equal(view.family, "P");
  assert.equal(view.slots.length, 4);
  assert.ok(view.slots.every((s) => s.readable));
  assert.deepEqual(
    view.slots.map((s) => s.label),
    [null, null, null, null],
  );
  assert.equal(matchingSet(state, listed, "P"), null);

  const record = recordFor(shoot.id, planWrite(state, explicitPp(shoot), "P"), "P", WRITTEN_AT);
  assert.deepEqual(overwrittenSlots(state, record), [1, 2, 3, 4]);
});

test("0x315 card: a set written and then changed by the camera reports only the changed slot", () => {
  const state = hangCard();
  const planned = planWrite(state, explicitPp(shoot), "P");
  const record = recordFor(shoot.id, planned, "P", WRITTEN_AT);
  const after = written(planned);
  assert.equal(recordHolds(after, record), true);

  const camera: CardState = {
    sonyMarkers: true,
    settingFiles: after.settingFiles.map((f, i) => (i === 1 ? state.settingFiles[1] : f)),
  };
  assert.deepEqual(overwrittenSlots(camera, record), [2]);
  assert.equal(recordHolds(camera, record), false);
});

test("every bundled and user set: planWrite gives four files, and a card holding them verifies as written", () => {
  const state = hangCard();
  for (const set of [...bundled, ...userSets(10)]) {
    const planned = planWrite(state, explicitPp(set), "P");
    assert.deepEqual(
      planned.map((p) => p.relPath.split("/").pop()),
      ["CAMPR01P.DAT", "CAMPR02P.DAT", "CAMPR03P.DAT", "CAMPR04P.DAT"],
      set.id,
    );
    assert.equal(onCard(planned, state), false, `${set.id} is not on the card before the write`);

    const after = written(planned);
    assert.equal(onCard(planned, after), true, `${set.id} is on the card after the write`);
    const record = recordFor(set.id, planned, "P", WRITTEN_AT);
    assert.equal(recordHolds(after, record), true, set.id);
    assert.deepEqual(overwrittenSlots(after, record), [], set.id);
  }
});

test("ten user sets: describeCard and matchingSet finish within the budget", () => {
  const sets = listedSets([...bundled, ...userSets(10)]);
  const state = hangCard();
  const started = performance.now();
  const view = describeCard(state, sets);
  const matched = view.family ? matchingSet(state, sets, view.family) : null;
  const elapsed = performance.now() - started;
  assert.equal(view.family, "P");
  assert.equal(matched, null);
  assert.ok(elapsed < BUDGET_MS, `took ${Math.round(elapsed)} ms, budget ${BUDGET_MS} ms`);
});

test("compare: a repeat call gives the same slots, and changing a returned list does not change later answers", () => {
  const state = hangCard();
  const expected = [...compare(state, shoot, "P")];
  assert.deepEqual(expected, [1, 2, 3, 4]);

  const got = compare(state, shoot, "P");
  got.length = 0;
  assert.deepEqual(compare(state, shoot, "P"), expected);
});

test("compare: a set that cannot be planned keeps throwing on every call", () => {
  const state = hangCard();
  const broken = { ...shoot, name: "" };
  assert.throws(() => compare(state, broken, "P"));
  assert.throws(() => compare(state, broken, "P"));
});

test("MEDIAPRO.XML from the same card is not read as a setting file", () => {
  const xml = fs.readFileSync(path.join(CARD_DIR, "MEDIAPRO.XML")).toString("base64");
  const plain = describeCard(hangCard(), listed);
  const withXml = describeCard(toCardState(inspected([{ name: "MEDIAPRO.XML", base64: xml }])), listed);
  assert.deepEqual(withXml, plain);
});
