/** datImport on the hybrid PP-on PAL fixture: slot 1 is mode A, AWB, PP selected. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importDat, toSlotSettings } from "../src/core/web/lib/datImport.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = path.join(ROOT, "fixtures/zve10-hybrid-ppon-pal/PRIVATE/SONY/SETTING/E10");
const load = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIXTURE_DIR, name)));

test("fixture CAMPR01P.DAT: mode A, wb awb, pp_selected 1", () => {
  const r = importDat(load("CAMPR01P.DAT"), "CAMPR01P.DAT");
  assert.equal(r.kind, "zve10");
  if (r.kind !== "zve10") return;
  assert.equal(r.recordMode, "photo");
  assert.equal(r.decoded.mode, "A");
  assert.equal(r.decoded.wb.mode, "awb");
  assert.equal(r.decoded.pp_selected, 1);
  const slot = toSlotSettings(r.decoded);
  assert.equal(slot.slot, 1);
  assert.equal(slot.family, "pal");
  assert.equal(slot.settings.mode, "A");
  assert.equal(slot.settings.ppOn, true);
});

test("all four fixture files import as ZV-E10 photo settings", () => {
  for (const i of [1, 2, 3, 4]) {
    const r = importDat(load(`CAMPR0${i}P.DAT`), `CAMPR0${i}P.DAT`);
    assert.equal(r.kind, "zve10", `slot ${i}`);
  }
});

test("garbage bytes give kind unknown, never throw", () => {
  const r = importDat(new Uint8Array(16), "junk.DAT");
  assert.equal(r.kind, "unknown");
});
