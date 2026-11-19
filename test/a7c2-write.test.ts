/** A7C II write gate: planA7c2 and planWriteFor refuse while the write flag is off. With the flag on, planA7c2 gives the web builder's four files. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { A7C2_SETTING_DIR, planA7c2 } from "../src/core/transfer/a7c2Plan.ts";
import { planWriteFor, TransferError, type CardState } from "../src/core/transfer/plan.ts";
import { A6400, A7C2, EXPERIMENTAL_WRITE, ZV_E10 } from "../src/core/models.ts";
import { buildSetA7c2, type A7c2SlotSettings } from "../src/core/web/lib/a7c2/apply.ts";
import { parseA7c2 } from "../src/core/web/lib/a7c2/dat.ts";
import { validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN9 = path.join(ROOT, "fixtures/a7c2-run9");
const bases = [1, 2, 3, 4].map((n) => new Uint8Array(fs.readFileSync(path.join(RUN9, `CAMPR0${n}P.DAT`))));
const settings: A7c2SlotSettings[] = [{ mode: "P" }, { mode: "A" }, { mode: "S" }, { mode: "M" }];
const sets = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const shoot = sets.find((s) => s.id === "shoot-easy")!;
const EMPTY: CardState = { sonyMarkers: true, settingFiles: [] };

const refusal = (name: string) => (e: unknown) => e instanceof TransferError && e.message === `Chưa hỗ trợ ghi cho ${name}`;

test("planA7c2 refuses while the write flag is off", () => {
  assert.equal(EXPERIMENTAL_WRITE.a7c2, false);
  assert.throws(() => planA7c2(bases, settings, "P"), refusal("A7C II"));
});

test("planWriteFor refuses a model whose write capability is off, and names it", () => {
  assert.throws(() => planWriteFor(A7C2, EMPTY, shoot, "P"), refusal("A7C II"));
  assert.throws(() => planWriteFor(A6400, EMPTY, shoot, "P"), refusal("A6400"));
});

test("planWriteFor still plans the ZV-E10 set", () => {
  assert.equal(planWriteFor(ZV_E10, EMPTY, shoot, "P").length, 4);
});

test("with the flag on, planA7c2 gives the web builder's four files, named and sized as the web test expects", () => {
  EXPERIMENTAL_WRITE.a7c2 = true;
  try {
    const files = planA7c2(bases, settings, "P");
    const built = buildSetA7c2(bases, settings, "P");
    assert.deepEqual(
      files.map((f) => f.relPath),
      [1, 2, 3, 4].map((n) => `${A7C2_SETTING_DIR}CAMPR0${n}P.DAT`),
    );
    files.forEach((f, i) => {
      assert.deepEqual(f.bytes, built[i].data);
      const dat = parseA7c2(f.bytes);
      assert.equal(dat.records.length, 1061);
      assert.deepEqual(dat.header, parseA7c2(bases[i]).header);
    });
  } finally {
    EXPERIMENTAL_WRITE.a7c2 = false;
  }
});
