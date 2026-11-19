/**
 * Slot editor rows: stage→rows map, options, held (Như máy) reads and writes, modified detection,
 * apply-to-all, reset to saved, and PP bank reads and writes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PP_FIELDS } from "../src/core/web/lib/zve10/dat.ts";
import type { SlotDraft } from "../src/core/web/lib/presetSets.ts";
import { STAGE_FIELDS } from "../src/core/sets/draft.ts";
import {
  PP_BANKS,
  ROW_FIELD,
  STAGE_ROWS,
  applyToAll,
  formatShift,
  isBankModified,
  isRowModified,
  isSlotModified,
  ppOptions,
  readPp,
  readRow,
  resetSlot,
  rowOptions,
  rowVisible,
  usesStepper,
  writePp,
  writeRow,
  type RowId,
} from "../src/core/sets/rows.ts";

function ppField(key: string) {
  const field = PP_FIELDS.find((f) => f.key === key);
  assert.ok(field, `missing PP field ${key}`);
  return field;
}

const PP_KEYS = new Set(["pp", "ppOn", "recipeId", "ppBanks", "bankIds"]);

const base: SlotDraft = {
  mode: "P",
  aperture: "2.8",
  shutter: "1/125",
  iso: "100",
  metering: "multi",
  focus: "AF-C",
  focusArea: "wide",
  facePriority: "off",
  preAF: "off",
  autoReview: "off",
  liveView: "setting-effect-on",
};
const awb: SlotDraft = { ...base, wb: { mode: "awb", ab: -3, gm: 2 } };
const ctemp: SlotDraft = { ...base, wb: { mode: "ctemp", kelvin: 5500, ab: 0, gm: 0 } };
const noWb: SlotDraft = { ...base };

test("stage rows: four stages, each row on one stage, every row appears once", () => {
  assert.equal(STAGE_ROWS.length, STAGE_FIELDS.length);
  const ids = STAGE_ROWS.flatMap((s) => [...s.main, ...s.advanced]);
  assert.equal(new Set(ids).size, ids.length, "a row appears on two stages");
  assert.equal(ids.length, Object.keys(ROW_FIELD).length, "a RowId is missing from STAGE_ROWS");
});

test("stage rows cover every non-PP field of their stage, and no field from another stage", () => {
  STAGE_ROWS.forEach((stage, s) => {
    const fields = new Set<string>(STAGE_FIELDS[s] as readonly string[]);
    const rowFields: string[] = [...stage.main, ...stage.advanced].map((id) => ROW_FIELD[id]);
    for (const f of rowFields) assert.ok(fields.has(f), `${f} is not a field of stage ${s}`);
    for (const f of fields) {
      if (!PP_KEYS.has(f)) assert.ok(rowFields.includes(f), `${f} has no row on stage ${s}`);
    }
  });
});

test("stage 1 Phơi sáng: Nâng cao holds the codec-only exposure fields", () => {
  assert.deepEqual(STAGE_ROWS[0].advanced, ["expCompSet", "flashMode", "steadyShot", "eFrontCurtain"]);
});

test("options: WB modes are only awb and ctemp, and ISO options exclude Auto", () => {
  assert.deepEqual([...rowOptions("wb")], ["awb", "ctemp"]);
  assert.ok(!rowOptions("iso").includes("auto"));
  assert.ok(!rowOptions("iso").includes("AUTO"));
  assert.deepEqual([...rowOptions("mode")], ["P", "A", "S", "M"]);
});

test("options: a stepper when more than 4 options, a segmented control otherwise", () => {
  assert.equal(usesStepper("aperture"), true);
  assert.equal(usesStepper("ab"), true);
  assert.equal(usesStepper("mode"), false);
  assert.equal(usesStepper("focus"), false);
  assert.equal(usesStepper("wb"), false);
});

test("options: the A-B and G-M shift range is -7..7 and kelvin is 2500..9900 by 100", () => {
  assert.equal(rowOptions("ab").length, 15);
  assert.equal(rowOptions("ab")[0], "-7");
  assert.equal(rowOptions("gm")[14], "7");
  assert.equal(rowOptions("kelvin").length, 75);
  assert.equal(rowOptions("kelvin")[0], "2500");
  assert.equal(rowOptions("kelvin")[74], "9900");
});

test("visibility: kelvin needs ctemp, ab and gm need a wb object", () => {
  assert.equal(rowVisible(noWb, "ab"), false);
  assert.equal(rowVisible(noWb, "kelvin"), false);
  assert.equal(rowVisible(awb, "ab"), true);
  assert.equal(rowVisible(awb, "kelvin"), false);
  assert.equal(rowVisible(ctemp, "kelvin"), true);
  assert.equal(rowVisible(base, "aperture"), true);
});

test("readRow: absent or keep is held (undefined)", () => {
  assert.equal(readRow({ ...base, aperture: "keep" }, "aperture"), undefined);
  assert.equal(readRow({ ...base, aperture: undefined }, "aperture"), undefined);
  assert.equal(readRow(noWb, "wb"), undefined);
  assert.equal(readRow(awb, "wb"), "awb");
  assert.equal(readRow(ctemp, "kelvin"), "5500");
  assert.equal(readRow(awb, "kelvin"), undefined);
});

test("writeRow: undefined holds the row, and the input slot is not changed", () => {
  const held = writeRow(base, "aperture", undefined);
  assert.equal("aperture" in held, false);
  assert.equal(base.aperture, "2.8");
  assert.equal("wb" in writeRow(awb, "wb", undefined), false);
});

test("writeRow wb: switching mode keeps ab and gm, and ctemp defaults to 5500 K", () => {
  assert.deepEqual(writeRow(awb, "wb", "ctemp").wb, { mode: "ctemp", kelvin: 5500, ab: -3, gm: 2 });
  assert.deepEqual(writeRow(ctemp, "wb", "awb").wb, { mode: "awb", ab: 0, gm: 0 });
  assert.deepEqual(writeRow(noWb, "wb", "awb").wb, { mode: "awb", ab: 0, gm: 0 });
  assert.deepEqual(writeRow(awb, "wb", "bogus"), awb, "an unknown mode is ignored");
});

test("writeRow kelvin: only in ctemp, and undefined is a no-op", () => {
  assert.deepEqual(writeRow(awb, "kelvin", "6000"), awb);
  assert.deepEqual(writeRow(ctemp, "kelvin", "6000").wb, { mode: "ctemp", kelvin: 6000, ab: 0, gm: 0 });
  assert.deepEqual(writeRow(ctemp, "kelvin", undefined), ctemp);
});

test("writeRow ab and gm: numbers, and need a wb object", () => {
  assert.deepEqual(writeRow(noWb, "ab", "3"), noWb);
  assert.deepEqual(writeRow(awb, "gm", "-2").wb, { mode: "awb", ab: -3, gm: -2 });
});

test("formatShift: A and G below zero, B and M above it", () => {
  assert.equal(formatShift("ab", -3), "A3");
  assert.equal(formatShift("ab", 3), "B3");
  assert.equal(formatShift("gm", -3), "G3");
  assert.equal(formatShift("gm", 3), "M3");
  assert.equal(formatShift("ab", 0), "0");
});

test("isRowModified: a changed value is modified, a held row against an absent field is not", () => {
  const edited = writeRow(base, "aperture", "4");
  assert.equal(isRowModified(base, edited, "aperture"), true);
  assert.equal(isRowModified(base, edited, "shutter"), false);
  assert.equal(isRowModified({ ...base, aperture: undefined }, { ...base, aperture: "keep" }, "aperture"), false);
});

test("isSlotModified: key order and keep-vs-absent do not count as a change", () => {
  const reordered = Object.fromEntries(Object.entries(base).reverse()) as SlotDraft;
  assert.equal(isSlotModified(base, reordered), false);
  assert.equal(isSlotModified(base, { ...base, aperture: "keep" }), true);
  assert.equal(isSlotModified(base, { ...base, shutter: undefined }), true);
  assert.equal(isSlotModified(base, { ...base, mode: "keep" }), true);
  assert.equal(isSlotModified({ ...noWb, aperture: undefined }, { ...noWb, aperture: "keep" }), false);
});

test("applyToAll: rows that show in a slot are set there, others are skipped", () => {
  const slots = [awb, ctemp, noWb, ctemp] as const;
  const kelvin = applyToAll(slots, "kelvin", "6000");
  assert.deepEqual(kelvin[0], awb);
  assert.equal((kelvin[1].wb as { kelvin: number }).kelvin, 6000);
  assert.deepEqual(kelvin[2], noWb);
  assert.equal((kelvin[3].wb as { kelvin: number }).kelvin, 6000);

  const ab = applyToAll(slots, "ab", "2");
  assert.equal((ab[0].wb as { ab: number }).ab, 2);
  assert.equal((ab[1].wb as { ab: number }).ab, 2);
  assert.deepEqual(ab[2], noWb);
  assert.equal((ab[3].wb as { ab: number }).ab, 2);
});

test("applyToAll: a plain row goes to all four slots, and undefined holds it in all four", () => {
  const slots = [base, awb, ctemp, noWb] as const;
  assert.deepEqual(
    applyToAll(slots, "aperture", "5.6").map((s) => s.aperture),
    ["5.6", "5.6", "5.6", "5.6"],
  );
  assert.deepEqual(
    applyToAll(slots, "aperture", undefined).map((s) => "aperture" in s),
    [false, false, false, false],
  );
});

test("applyToAll wb: ctemp goes to all four slots and keeps an existing kelvin", () => {
  const out = applyToAll([awb, ctemp, noWb, awb], "wb", "ctemp");
  assert.deepEqual(out.map((s) => (s.wb as { mode: string }).mode), ["ctemp", "ctemp", "ctemp", "ctemp"]);
  assert.equal((out[1].wb as { kelvin: number }).kelvin, 5500);
});

test("resetSlot: one slot goes back to its saved settings, the others stay as drafted", () => {
  const saved = [base, base, base, base];
  const draft = [base, writeRow(base, "aperture", "16"), base, writeRow(base, "mode", "M")];
  const out = resetSlot(draft, saved, 1);
  assert.deepEqual(out[1], saved[1]);
  assert.equal(out[3], draft[3]);
});

test("PP parameters: the codec has 25, and there are 10 banks", () => {
  assert.equal(PP_FIELDS.length, 25);
  assert.equal(PP_BANKS.length, 10);
});

test("PP bank 1 is slot.pp: writes set recipeId custom, and removing the last one clears pp", () => {
  const set = writePp(base, 1, "black_level", "3");
  assert.deepEqual(set.pp, { black_level: 3 });
  assert.equal(set.recipeId, "custom");
  assert.equal(readPp(set, 1, "black_level"), "3");
  const cleared = writePp(set, 1, "black_level", undefined);
  assert.equal("pp" in cleared, false);
  assert.equal("recipeId" in cleared, false);
});

test("PP banks 2–10 are ppBanks: each write keeps other banks and pp, and drops the bank recipe id", () => {
  const withIds: SlotDraft = { ...base, bankIds: { 3: "some-recipe", 4: "other" } };
  const set = writePp(withIds, 3, "black_level", "-2");
  assert.deepEqual(set.ppBanks, { 3: { black_level: -2 } });
  assert.deepEqual(set.bankIds, { 4: "other" });
  assert.equal(readPp(set, 3, "black_level"), "-2");
  assert.equal(set.pp, undefined);
});

test("PP banks: an emptied bank is removed, and so is the ppBanks key when none is left", () => {
  const set = writePp({ ...base, ppBanks: { 3: { black_level: -2 } } }, 3, "black_level", undefined);
  assert.equal("ppBanks" in set, false);
  assert.equal(readPp(set, 3, "black_level"), undefined);
});

test("PP: an int parameter is written as a number", () => {
  const set = writePp(base, 1, "knee_auto_max", "90.5");
  assert.deepEqual(set.pp, { knee_auto_max: 90.5 });
  assert.equal(readPp(set, 1, "knee_auto_max"), "90.5");
});

test("isBankModified: only the changed bank is modified", () => {
  const saved: SlotDraft = { ...base, ppBanks: { 3: { black_level: 1 } } };
  const draft = writePp(saved, 3, "black_level", "2");
  assert.equal(isBankModified(saved, draft, 3), true);
  assert.equal(isBankModified(saved, draft, 2), false);
  assert.equal(isBankModified(saved, writePp(saved, 1, "black_level", "1"), 1), true);
});

test("ppOptions: an int parameter runs min to max by step, an enum lists its options", () => {
  const level = ppOptions(ppField("black_level"));
  assert.equal(level.length, 31);
  assert.equal(level[0], "-15");
  assert.equal(level[30], "15");

  const knee = ppOptions(ppField("knee_auto_max"));
  assert.equal(knee.length, 21);
  assert.equal(knee[0], "90");
  assert.equal(knee[1], "90.5");
  assert.equal(knee[20], "100");

  assert.deepEqual(ppOptions(ppField("knee_mode")), ["Auto", "Manual"]);
});

test("held PP bank reads as undefined for every parameter", () => {
  const slot: SlotDraft = { ...base, pp: "keep" };
  for (const bank of PP_BANKS) {
    for (const f of PP_FIELDS) assert.equal(readPp(slot, bank, f.key), undefined);
  }
});
