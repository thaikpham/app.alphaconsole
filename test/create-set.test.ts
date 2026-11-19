/** New set from a copy: name and slot labels trimmed and limited, empty labels fall back to the base label. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyNewSet, clipText, NEW_LABEL_LIMIT, NEW_NAME_LIMIT, slotLabel } from "../src/home/createSet.ts";
import type { PresetSet, PresetSlot } from "../src/core/web/lib/presetSets.ts";

const slot = (label: string, note?: string): PresetSlot => ({
  label,
  ...(note ? { note } : {}),
  settings: {} as PresetSlot["settings"],
});

const copy: PresetSet = {
  id: "mine-copy",
  name: "Đời thường (bản sao)",
  description: "Mô tả",
  slots: [slot("Đời thường", "n1"), slot("Chân dung"), slot("Hoàng hôn"), slot("Đêm")],
};

test("clipText trims and keeps at most the given number of code points", () => {
  assert.equal(clipText("  Cưới ngoài trời  ", 32), "Cưới ngoài trời");
  assert.equal(clipText("abcdef", 3), "abc");
  assert.equal(clipText("   ", 5), "");
});

test("clipText never splits an astral character", () => {
  assert.equal(clipText("😀😀😀", 2), "😀😀");
});

test("slotLabel falls back to the base label when the typed one is blank", () => {
  assert.equal(slotLabel("", "Đêm"), "Đêm");
  assert.equal(slotLabel("   ", "Đêm"), "Đêm");
  assert.equal(slotLabel(" Cưới ", "Đêm"), "Cưới");
});

test("slotLabel is limited to NEW_LABEL_LIMIT", () => {
  assert.equal(slotLabel("x".repeat(25), "base").length, NEW_LABEL_LIMIT);
});

test("applyNewSet takes the id and description of the copy and the trimmed name", () => {
  const result = applyNewSet(copy, "  Cưới ngoài trời ", []);
  assert.equal(result.id, "mine-copy");
  assert.equal(result.description, "Mô tả");
  assert.equal(result.name, "Cưới ngoài trời");
});

test("applyNewSet keeps exactly four slots, with base labels where the typed ones are empty", () => {
  const result = applyNewSet(copy, "Mới", ["", "Cưới", " ", "Đêm mới"]);
  assert.equal(result.slots.length, 4);
  assert.deepEqual(
    result.slots.map((s) => s.label),
    ["Đời thường", "Cưới", "Hoàng hôn", "Đêm mới"],
  );
});

test("applyNewSet keeps the notes and settings of each slot", () => {
  const result = applyNewSet(copy, "Mới", []);
  assert.equal(result.slots[0].note, "n1");
  assert.equal(result.slots[0].settings, copy.slots[0].settings);
});

test("applyNewSet limits the name and the slot labels", () => {
  const result = applyNewSet(copy, "a".repeat(40), ["y".repeat(30), "", "", ""]);
  assert.equal(result.name.length, NEW_NAME_LIMIT);
  assert.equal(result.slots[0].label.length, NEW_LABEL_LIMIT);
});

test("applyNewSet keeps the copy's name when the typed name is blank", () => {
  assert.equal(applyNewSet(copy, "   ", []).name, copy.name);
});

test("applyNewSet does not change the copy", () => {
  applyNewSet(copy, "Mới", ["Cưới", "", "", ""]);
  assert.equal(copy.name, "Đời thường (bản sao)");
  assert.equal(copy.slots[0].label, "Đời thường");
});
