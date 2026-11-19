/** Camera registry: search normalizing, lookup by card and USB id, capabilities and the choice of model. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  A6400,
  A7C2,
  CAMERAS,
  EXPERIMENTAL_WRITE,
  ZV_E10,
  chooseModel,
  findModels,
  modelById,
  modelFromSystemKind,
  modelFromUsbProductId,
  normalizeModelQuery,
} from "../src/core/models.ts";

const ids = (query: string) => findModels(query).map((m) => m.id);

test("normalizeModelQuery drops case, spaces, hyphens and the ILCE prefix", () => {
  assert.equal(normalizeModelQuery("ZV E10"), "zve10");
  assert.equal(normalizeModelQuery("zv-e10"), "zve10");
  assert.equal(normalizeModelQuery("  ZVE10 "), "zve10");
  assert.equal(normalizeModelQuery("ILCE-7CM2"), "7cm2");
  assert.equal(normalizeModelQuery("ilce 6400"), "6400");
  assert.equal(normalizeModelQuery("A7C II"), "a7cii");
});

test("findModels matches ZV-E10 and A7C II under the spellings users type", () => {
  for (const query of ["zve10", "ZV E10", "ZV-E10", "ZVE10", "ILCE-ZVE10"]) {
    assert.deepEqual(ids(query), ["zve10"], query);
  }
  for (const query of ["a7c2", "a7cii", "A7C II", "A7C-2", "ILCE-7CM2"]) {
    assert.deepEqual(ids(query), ["a7c2"], query);
  }
});

test("findModels keeps A7C and A7C II apart", () => {
  assert.deepEqual(ids("a7c"), ["a7c"]);
  assert.deepEqual(ids("A7C"), ["a7c"]);
  assert.deepEqual(ids("a7c2"), ["a7c2"]);
});

test("findModels matches ZV-E1 under the brief's ILCE spelling and its own", () => {
  assert.deepEqual(ids("ZV-E1"), ["zve1"]);
  assert.deepEqual(ids("ILCE-ZVE1"), ["zve1"]);
});

test("findModels returns nothing for an empty or unknown query", () => {
  assert.deepEqual(findModels(""), []);
  assert.deepEqual(findModels(" - "), []);
  assert.deepEqual(findModels("a9"), []);
});

test("every model is found by its own name", () => {
  for (const model of CAMERAS) {
    assert.deepEqual(findModels(model.name), [model], model.name);
  }
});

test("registry has one entry per id and one write-capable model", () => {
  assert.equal(new Set(CAMERAS.map((m) => m.id)).size, CAMERAS.length);
  const writable = CAMERAS.filter((m) => m.capabilities.write).map((m) => m.id);
  assert.deepEqual(writable, ["zve10"]);
});

test("A7C II is readable, not writable, with the trial reason", () => {
  assert.equal(A7C2.capabilities.read, true);
  assert.equal(A7C2.capabilities.write, false);
  assert.equal(A7C2.capabilities.reason, "chưa thử trên máy");
  assert.equal(A7C2.settingFolder, "7CM2");
});

test("A6400 is readable under the trial reason, not writable, with no folder yet", () => {
  assert.equal(A6400.capabilities.read, true);
  assert.equal(A6400.capabilities.write, false);
  assert.equal(A6400.settingFolder, null);
});

test("ZV-E10 is readable and writable, in the E10 folder", () => {
  assert.deepEqual(ZV_E10.capabilities, { read: true, write: true, reason: null });
  assert.equal(ZV_E10.settingFolder, "E10");
});

test("models not yet supported are neither readable nor writable", () => {
  for (const id of ["a6700", "a7c", "a7iv", "zve1"]) {
    const model = modelById(id);
    assert.ok(model, id);
    assert.equal(model.capabilities.read, false, id);
    assert.equal(model.capabilities.write, false, id);
    assert.equal(model.capabilities.reason, "Sắp có", id);
  }
});

test("EXPERIMENTAL_WRITE keeps A7C II off by default", () => {
  assert.deepEqual(EXPERIMENTAL_WRITE, { a7c2: false });
});

test("modelFromSystemKind reads a registry name and ignores what it does not know", () => {
  assert.equal(modelFromSystemKind(null), null);
  assert.equal(modelFromSystemKind("ZV-E10"), ZV_E10);
  assert.equal(modelFromSystemKind("ILCE-7CM2"), A7C2);
  assert.equal(modelFromSystemKind("unknown body"), null);
});

test("modelFromUsbProductId maps the ZV-E10 Mass Storage and PC Remote ids only", () => {
  assert.equal(modelFromUsbProductId(0x0d95), ZV_E10);
  assert.equal(modelFromUsbProductId(0x0d97), ZV_E10);
  assert.equal(modelFromUsbProductId(0x0d96), null);
});

test("chooseModel prefers the card, then the USB id, then the stored choice, then ZV-E10", () => {
  assert.equal(chooseModel({ systemKind: "ILCE-7CM2", productId: 0x0d95, selected: "zve10" }), A7C2);
  assert.equal(chooseModel({ systemKind: null, productId: 0x0d95, selected: "a7c2" }), ZV_E10);
  assert.equal(chooseModel({ systemKind: "junk", productId: null, selected: "a7c2" }), A7C2);
  assert.equal(chooseModel({ systemKind: null, productId: null, selected: null }), ZV_E10);
  assert.equal(chooseModel({ systemKind: null, productId: 0x0000, selected: "a6400" }), A6400);
});
