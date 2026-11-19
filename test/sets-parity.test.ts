/**
 * Editor output equals the web codec. A bundled set is copied through the app store, edited, and checked with
 * validateEdited. Then planWrite (app) must match buildPresetFiles (web) byte for byte on PAL and NTSC.
 * With PP off and PP values present, both sides must refuse with the same message.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPresetFiles } from "../../Web.AlphaColorLab/lib/presetDownload.ts";
import { cloneSlots as webCloneSlots } from "../../Web.AlphaColorLab/lib/presetSets.ts";
import { planWrite, type Family } from "../src/core/transfer/plan.ts";
import { createSetStore, type SetsAdapter } from "../src/core/sets/store.ts";
import { setPp, setSetting, validateEdited } from "../src/core/sets/draft.ts";
import { defaultSet, validatePresetSets, type PresetSet, type SlotDraft } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "..", "Web.AlphaColorLab");
const GUIDE = "parity guide";
const PP_OFF = "Tắt Picture Profile thì không chỉnh thông số PP.";
const EMPTY_CARD = { sonyMarkers: true, settingFiles: [] };
const CASES: { system: "pal" | "ntsc"; family: Family }[] = [
  { system: "pal", family: "P" },
  { system: "ntsc", family: "N" },
];

const webBytes = (rel: string) => new Uint8Array(fs.readFileSync(path.join(WEB, rel)));
const bundled = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));

function memoryAdapter(): SetsAdapter {
  let text: string | null = null;
  return {
    read: async () => text,
    write: async (t) => {
      text = t;
    },
  };
}

function webCodec(system: "pal" | "ntsc") {
  return {
    base: webBytes(`public/dat/zve10-base-${system}.dat`),
    headers: [1, 2, 3, 4].map((i) => webBytes(`public/dat/zve10-${system}-m${i}.dat`)),
  };
}

function withSlot(set: PresetSet, index: number, edit: (s: SlotDraft) => SlotDraft): PresetSet {
  const slots = set.slots.map((slot, i) => (i === index ? { ...slot, settings: edit(slot.settings) } : slot));
  return { ...set, slots: slots as PresetSet["slots"] };
}

/** Slot 1: Kelvin white balance and PP on, with three PP values. */
function tune(s: SlotDraft): SlotDraft {
  let next = setSetting(s, "ppOn", true);
  next = setSetting(next, "wb", { mode: "ctemp", kelvin: 5600, ab: 2, gm: -1 });
  next = setPp(next, "black_level", 3);
  next = setPp(next, "gamma", "Still");
  return setPp(next, "saturation", 10);
}

async function duplicateBundled(): Promise<PresetSet> {
  return createSetStore(memoryAdapter(), bundled).duplicate(defaultSet(bundled).id);
}

describe("edited copy of a bundled set matches the web codec", () => {
  for (const { system, family } of CASES) {
    test(`${system}: four files, byte for byte`, async () => {
      const copy = await duplicateBundled();
      const result = validateEdited(withSlot(copy, 0, tune));
      if (!("set" in result)) assert.fail(`edited set rejected: ${result.error.message}`);
      const set = result.set;

      const { base, headers } = webCodec(system);
      const web = buildPresetFiles(webCloneSlots(set), base, headers, GUIDE).files;
      const app = planWrite(EMPTY_CARD, set, family);
      assert.equal(app.length, 4);
      assert.equal(web.length, 4);
      web.forEach((wf, i) => {
        assert.equal(app[i].relPath, `PRIVATE/SONY/SETTING/E10/${wf.name}`);
        assert.deepEqual(app[i].bytes, wf.data, `${wf.name} bytes`);
      });
    });

    test(`${system}: the edit changes slot 1 bytes`, async () => {
      const copy = await duplicateBundled();
      const result = validateEdited(withSlot(copy, 0, tune));
      if (!("set" in result)) assert.fail(`edited set rejected: ${result.error.message}`);
      assert.notDeepEqual(planWrite(EMPTY_CARD, copy, family)[0].bytes, planWrite(EMPTY_CARD, result.set, family)[0].bytes);
    });
  }
});

test("PP values with PP off fail with the same message on app and web", async () => {
  const copy = await duplicateBundled();
  const off = withSlot(copy, 0, (s) => setPp(setSetting(s, "ppOn", false), "black_level", 3));

  const result = validateEdited(off);
  if (!("error" in result)) assert.fail("validateEdited accepted PP values with PP off");
  assert.equal(result.error.message, PP_OFF);
  assert.equal(result.error.path, "ppOn");

  for (const { system } of CASES) {
    const { base, headers } = webCodec(system);
    assert.throws(() => buildPresetFiles(webCloneSlots(off), base, headers, GUIDE), { message: PP_OFF });
  }
});
