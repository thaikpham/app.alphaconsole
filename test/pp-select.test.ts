/** zv-e10-hybrid: every built file selects PP1 (byte 0x315 = 1) on PAL and NTSC. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explicitPp, planWrite } from "../src/core/transfer/plan.ts";
import { parseDat, decodeDat } from "../src/core/web/lib/zve10/dat.ts";
import { validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PP1_SELECT = 0x315;
const sets = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const bundled = sets.find((s) => s.id === "zv-e10-hybrid");
if (!bundled) throw new Error("zv-e10-hybrid missing");
const hybrid = explicitPp(bundled);

for (const family of ["P", "N"] as const) {
  test(`zv-e10-hybrid ${family}: 0x315 = 1 in all four files`, () => {
    const files = planWrite({ sonyMarkers: true, settingFiles: [] }, hybrid, family);
    assert.equal(files.length, 4);
    for (const f of files) {
      assert.equal(f.bytes[PP1_SELECT], 1, `${f.relPath} 0x315`);
      assert.equal(decodeDat(f.bytes).pp_selected, 1, `${f.relPath} pp_selected`);
      assert.doesNotThrow(() => parseDat(f.bytes), f.relPath);
    }
  });
}
