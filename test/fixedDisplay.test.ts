/**
 * Fixed display settings: the three camera settings the slot editor shows read-only in Hiển thị.
 * They must stay outside the slot rows, so nothing writes, holds or marks them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { content } from "../src/content.ts";
import { FIXED_DISPLAY } from "../src/core/sets/fixedDisplay.ts";
import { ROW_FIELD, STAGE_ROWS } from "../src/core/web/lib/app-core/sets/rows.ts";

test("the fixed display list is the three camera settings, each with its fixed value", () => {
  assert.deepEqual(FIXED_DISPLAY, [
    { id: "displayQuality", value: "high" },
    { id: "monitorBrightness", value: "sunny-weather" },
    { id: "autoPowerOffTemp", value: "high" },
  ]);
});

test("fixed display items are not slot rows and map to no SlotSettings field", () => {
  const rowIds = new Set<string>(STAGE_ROWS.flatMap((s) => [...s.main, ...s.advanced]));
  for (const item of FIXED_DISPLAY) {
    assert.equal(rowIds.has(item.id), false, `${item.id} is a slot row`);
    assert.equal(item.id in ROW_FIELD, false, `${item.id} maps to a SlotSettings field`);
  }
});

test("each fixed display item has its label, ZV-E10 menu path and value text in content.ts", () => {
  for (const item of FIXED_DISPLAY) {
    const row = content.fixedDisplay.rows[item.id];
    assert.ok(row.label.length > 0, `${item.id} has no label`);
    assert.ok(row.path.startsWith("MENU › "), `${item.id} path is not a MENU path`);
    assert.ok(content.fixedDisplay.values[item.value].length > 0, `${item.value} has no text`);
  }
});
