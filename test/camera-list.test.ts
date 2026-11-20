/** Camera search (SPEC 5.7 norm) and the device pick / camera sheet grouping. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAMERAS, type CameraModel } from "../src/core/web/lib/app-core/models.ts";
import { groupCameras, matchesSearch, normalizeSearch } from "../src/camera/cameraList.ts";

const ids = (models: readonly CameraModel[]) => models.map((model) => model.id);
const byId = (id: string): CameraModel => {
  const model = CAMERAS.find((m) => m.id === id);
  if (!model) throw new Error(`no camera ${id}`);
  return model;
};

test("the search norm drops case, spaces, '-', '_' and '.'", () => {
  assert.equal(normalizeSearch("ZV-E10"), "zve10");
  assert.equal(normalizeSearch("zv e10"), "zve10");
  assert.equal(normalizeSearch("ZV.E10"), "zve10");
  assert.equal(normalizeSearch("a_7 c"), "a7c");
});

test("a query matches on name, Sony model or alias, ignoring the norm's removed characters", () => {
  assert.equal(matchesSearch(byId("zve10"), "zv e10"), true);
  assert.equal(matchesSearch(byId("a7c2"), "ILCE-7CM2"), true);
  assert.equal(matchesSearch(byId("a7iv"), "a74"), true);
  assert.equal(matchesSearch(byId("a7iv"), "a7 iv"), true);
  assert.equal(matchesSearch(byId("zve10"), "a6400"), false);
});

test("an empty query matches every camera and an unknown query matches none", () => {
  assert.equal(groupCameras(CAMERAS, "   ").supported.length + groupCameras(CAMERAS, "   ").soon.length, CAMERAS.length);
  assert.deepEqual(groupCameras(CAMERAS, "zz9"), { supported: [], soon: [] });
});

test("writable cameras form the supported group and the rest form the soon group", () => {
  const groups = groupCameras(CAMERAS, "");
  assert.deepEqual(ids(groups.supported), ["zve10"]);
  // SPEC 2.4.9 order: A6400, A6700, A7C, A7C II, A7 IV, ZV-E1.
  assert.deepEqual(ids(groups.soon), ["a6400", "a6700", "a7c", "a7c2", "a7iv", "zve1"]);
});

test("a query narrows both groups and keeps the sorted order", () => {
  assert.deepEqual(groupCameras(CAMERAS, "a7c"), { supported: [], soon: [byId("a7c"), byId("a7c2")] });
  assert.deepEqual(groupCameras(CAMERAS, "zv"), { supported: [byId("zve10")], soon: [byId("zve1")] });
});
