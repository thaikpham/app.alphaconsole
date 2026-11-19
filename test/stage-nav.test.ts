/**
 * Stage navigation in the slot editor: Tiếp order across slots, Bước trước, and taps on a stage of the current slot.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPosition, positionOfStage, prevPosition } from "../src/core/sets/stageNav.ts";

const LAST_SLOT = 3;
const LAST_STAGE = 3;

test("nextPosition: Tiếp walks the stages of a slot, then stage 0 of the next slot", () => {
  assert.deepEqual(nextPosition({ slot: 0, stage: 0 }, LAST_SLOT, LAST_STAGE), { slot: 0, stage: 1 });
  assert.deepEqual(nextPosition({ slot: 0, stage: 3 }, LAST_SLOT, LAST_STAGE), { slot: 1, stage: 0 });
});

test("nextPosition: 15 steps from M1 Phơi sáng reach M4 last stage, and the end holds", () => {
  let pos = { slot: 0, stage: 0 };
  for (let i = 0; i < 15; i++) pos = nextPosition(pos, LAST_SLOT, LAST_STAGE);
  assert.deepEqual(pos, { slot: 3, stage: 3 });
  assert.deepEqual(nextPosition(pos, LAST_SLOT, LAST_STAGE), pos);
});

test("prevPosition: Bước trước goes back one stage of the same slot, and stops at stage 0", () => {
  assert.deepEqual(prevPosition({ slot: 2, stage: 3 }), { slot: 2, stage: 2 });
  assert.deepEqual(prevPosition({ slot: 2, stage: 0 }), { slot: 2, stage: 0 });
});

test("positionOfStage: a tap keeps the slot and jumps to any stage, forward or back", () => {
  assert.deepEqual(positionOfStage({ slot: 2, stage: 0 }, 3, LAST_STAGE), { slot: 2, stage: 3 });
  assert.deepEqual(positionOfStage({ slot: 2, stage: 3 }, 1, LAST_STAGE), { slot: 2, stage: 1 });
});

test("positionOfStage: an index outside the stage list is ignored", () => {
  const pos = { slot: 1, stage: 2 };
  for (const bad of [-1, 4, 1.5, Number.NaN]) assert.deepEqual(positionOfStage(pos, bad, LAST_STAGE), pos);
});
