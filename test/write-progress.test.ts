/** Write stages, stepper position, and ring count for the write screen. Pure helpers: src/write/progress.ts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RING_TOTAL, ringCount, stageOf, stepIndex } from "../src/write/progress.ts";

test("a confirmed write fills all four ring segments", () => {
  assert.equal(ringCount("ok", 0), RING_TOTAL);
  assert.equal(ringCount("ok", 4), RING_TOTAL);
});

test("while writing the ring follows the confirmed files and stops at three", () => {
  assert.equal(ringCount("writing", 0), 0);
  assert.equal(ringCount("writing", 2), 2);
  assert.equal(ringCount("writing", 3), 3);
  assert.equal(ringCount("writing", 4), 3);
  assert.equal(ringCount("writing", -1), 0);
});

test("an idle or failed write shows no ring", () => {
  for (const phase of ["idle", "rolledBack", "kept"] as const) {
    assert.equal(ringCount(phase, 3), 0, phase);
  }
});

test("the stage follows the phase, and recall only follows a confirmed write", () => {
  assert.equal(stageOf("idle", false), "connect");
  assert.equal(stageOf("writing", false), "writing");
  assert.equal(stageOf("ok", false), "done");
  assert.equal(stageOf("ok", true), "recall");
  assert.equal(stageOf("rolledBack", false), "failed");
  assert.equal(stageOf("kept", false), "failed");
});

test("the stepper is on Ghi (3) for every write stage and on Nạp (4) for recall", () => {
  for (const stage of ["connect", "writing", "done", "failed"] as const) {
    assert.equal(stepIndex(stage), 3, stage);
  }
  assert.equal(stepIndex("recall"), 4);
});
