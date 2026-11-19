/** Saved camera selection (camera.json text): a saved id reads back as that model, anything else is no selection. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAMERAS, parseCameraSelection } from "../src/core/models.ts";

test("a saved id reads back as that model, for every registry model", () => {
  for (const model of CAMERAS) assert.equal(parseCameraSelection(JSON.stringify({ model: model.id })), model.id);
});

test("text that is not a saved selection gives null", () => {
  assert.equal(parseCameraSelection(null), null);
  assert.equal(parseCameraSelection('{"model":'), null);
  assert.equal(parseCameraSelection('{"model":"zz9"}'), null);
  assert.equal(parseCameraSelection("{}"), null);
  assert.equal(parseCameraSelection('{"model":5}'), null);
  assert.equal(parseCameraSelection("null"), null);
  assert.equal(parseCameraSelection('["a7c2"]'), null);
});
