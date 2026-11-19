/** iOS sheet detent heights (SPEC-IOS §6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { detentHeight } from "../../src/ui/detent.ts";

test("medium is 440 pt", () => {
  assert.equal(detentHeight("medium", 852, 59), 440);
  assert.equal(detentHeight("medium", 852, 0), 440);
});

test("medium clamps to the window height", () => {
  assert.equal(detentHeight("medium", 400, 0), 400);
});

test("large is the window minus the top inset and 8 pt", () => {
  assert.equal(detentHeight("large", 852, 59), 785);
});

test("heights clamp at zero", () => {
  assert.equal(detentHeight("large", 10, 59), 0);
  assert.equal(detentHeight("medium", -4, 0), 0);
});
