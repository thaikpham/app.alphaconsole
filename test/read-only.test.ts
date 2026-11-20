/** Read-only decode: describeReadOnly on the A6400 sample and the A7C II run9 bases. A file that does not decode, or belongs to another model, gives no rows. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeReadOnly } from "../src/core/web/lib/app-core/card/readOnly.ts";
import { A6400, A7C2, ZV_E10 } from "../src/core/web/lib/app-core/models.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = (dir: string, name: string) => ({
  name,
  bytes: new Uint8Array(fs.readFileSync(path.join(ROOT, "fixtures", dir, name))),
});

test("no CAMPR files: all four slots have no rows", () => {
  assert.deepEqual(describeReadOnly(A6400, []).map((s) => s.rows), [null, null, null, null]);
});

test("A6400 sample: slot 1 decodes to rows, the other slots have no file", () => {
  const slots = describeReadOnly(A6400, [file("a6400-sample", "CAMPR01P.DAT")]);
  assert.deepEqual(slots.map((s) => s.slot), [1, 2, 3, 4]);
  const rows = slots[0].rows;
  assert.ok(rows && rows.length > 0);
  assert.ok(rows.every((r) => r.settingId.length > 0 && r.valueLabel.length > 0));
  assert.deepEqual(slots.slice(1).map((s) => s.rows), [null, null, null]);
});

test("A7C II run9 bases: each of the four slots decodes to rows", () => {
  const files = [1, 2, 3, 4].map((n) => file("a7c2-run9", `CAMPR0${n}P.DAT`));
  for (const slot of describeReadOnly(A7C2, files)) assert.ok(slot.rows && slot.rows.length > 0, `slot ${slot.slot}`);
});

test("garbage bytes give no rows and do not throw", () => {
  const junk = { name: "CAMPR01P.DAT", bytes: new Uint8Array(4608).fill(0x41) };
  assert.equal(describeReadOnly(A6400, [junk])[0].rows, null);
});

test("a file of another model gives no rows", () => {
  assert.equal(describeReadOnly(A6400, [file("a7c2-run9", "CAMPR01P.DAT")])[0].rows, null);
  assert.equal(describeReadOnly(A7C2, [file("a6400-sample", "CAMPR01P.DAT")])[0].rows, null);
  assert.equal(describeReadOnly(ZV_E10, [file("a6400-sample", "CAMPR01P.DAT")])[0].rows, null);
});

test("a name outside CAMPR01-04 with P or N is not a slot", () => {
  const bytes = file("a6400-sample", "CAMPR01P.DAT").bytes;
  assert.deepEqual(describeReadOnly(A6400, [{ name: "CAMPR05P.DAT", bytes }]).map((s) => s.rows), [null, null, null, null]);
});
