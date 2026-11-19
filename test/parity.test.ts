/**
 * Parity: for every set in data/preset-sets.json x PAL/NTSC, the app's planWrite (copied codec, bundled bases)
 * must produce the same four files, byte for byte, as the web's buildPresetFiles on the web originals.
 * Also checks that the bundled bases equal the web's public/dat files.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPresetFiles } from "../../Web.AlphaColorLab/lib/presetDownload.ts";
import { validatePresetSets as webValidate, cloneSlots } from "../../Web.AlphaColorLab/lib/presetSets.ts";
import { explicitPp, planWrite, type Family } from "../src/core/transfer/plan.ts";
import { base64ToBytes, loadBase, loadHeaders, type System } from "../src/core/bases.ts";
import { DAT_BASES_B64 } from "../src/core/web/generated/datBases.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "..", "Web.AlphaColorLab");
const GUIDE = "parity guide";
const webBytes = (rel: string) => new Uint8Array(fs.readFileSync(path.join(WEB, rel)));
const EMPTY_CARD = { sonyMarkers: true, settingFiles: [] };

const webSets = webValidate(JSON.parse(fs.readFileSync(path.join(WEB, "data/preset-sets.json"), "utf8")));
const appSets = JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8"));

test("app copy of preset-sets.json equals the web original", () => {
  assert.deepEqual(appSets, JSON.parse(fs.readFileSync(path.join(WEB, "data/preset-sets.json"), "utf8")));
});

describe("bundled bases equal web public/dat", () => {
  for (const system of ["pal", "ntsc"] as const) {
    test(`${system} base and headers`, () => {
      assert.deepEqual(loadBase(system), webBytes(`public/dat/zve10-base-${system}.dat`));
      loadHeaders(system).forEach((h, i) => assert.deepEqual(h, webBytes(`public/dat/zve10-${system}-m${i + 1}.dat`)));
    });
  }
  test("base64 decoder round-trips the generated module", () => {
    const b64 = DAT_BASES_B64["zve10-base-ntsc"];
    assert.deepEqual(base64ToBytes(b64), webBytes("public/dat/zve10-base-ntsc.dat"));
  });
});

for (const [system, family] of [["pal", "P"], ["ntsc", "N"]] as const satisfies readonly [System, Family][]) {
  describe(`preset sets ${system}`, () => {
    const base = webBytes(`public/dat/zve10-base-${system}.dat`);
    const headers = [1, 2, 3, 4].map((i) => webBytes(`public/dat/zve10-${system}-m${i}.dat`));

    for (const set of webSets) {
      test(`${set.id} ${system}`, () => {
        let webFiles: { name: string; data: Uint8Array }[] | undefined;
        let webError: string | undefined;
        try {
          webFiles = buildPresetFiles(cloneSlots(set), base, headers, GUIDE).files;
        } catch (e) {
          webError = (e as Error).message;
        }

        let appFiles: { relPath: string; bytes: Uint8Array }[] | undefined;
        let appError: string | undefined;
        try {
          appFiles = planWrite(EMPTY_CARD, explicitPp(set), family);
        } catch (e) {
          appError = (e as Error).message;
        }

        if (webError !== undefined || appError !== undefined) {
          assert.equal(appError, webError, "app and web must fail the same way");
          return;
        }
        assert.ok(webFiles && appFiles);
        assert.equal(appFiles.length, 4);
        webFiles.forEach((wf, i) => {
          const af = appFiles[i];
          assert.equal(af.relPath, `PRIVATE/SONY/SETTING/E10/${wf.name}`);
          assert.deepEqual(af.bytes, wf.data, `${wf.name} bytes`);
        });
      });
    }
  });
}
