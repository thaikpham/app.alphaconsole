/**
 * Editor option lists: each enum list equals its codec export, every value has a label in content.ts,
 * and the lists match test/fixtures/sets-options.json. Run with UPDATE_SNAPSHOT=1 to rewrite the fixture.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AB_GM_RANGE,
  APERTURE_OPTIONS,
  ENUM_OPTIONS,
  ISO_OPTIONS,
  KELVIN_RANGE,
  SHUTTER_OPTIONS,
} from "../src/core/web/lib/app-core/sets/options.ts";
import {
  APERTURES,
  AUTO_REVIEW,
  AWB_PRIORITIES,
  E_FRONT_CURTAIN,
  EXP_COMP_SETS,
  FACE_PRIORITY,
  FLASH_MODES,
  FOCUS_AREAS,
  FOCUS_PROFILE,
  ISOS,
  LIVE_VIEW,
  METERING_MODES,
  PRE_AF,
  PROFILE,
  SHUTTERS,
  SOFT_SKIN,
  STEADY_SHOT,
} from "../src/core/web/lib/zve10/dat.ts";
import { content } from "../src/content.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "test", "fixtures", "sets-options.json");

// Codec export for each enum field. wbMode has no codec export (validatePresetSets hand-codes it), so it is not here.
const CODEC: Record<keyof typeof ENUM_OPTIONS, readonly string[] | Record<string, unknown>> = {
  mode: PROFILE.shoot_modes,
  focus: FOCUS_PROFILE.modes,
  wbMode: ["awb", "ctemp"],
  focusArea: FOCUS_AREAS,
  metering: METERING_MODES,
  facePriority: FACE_PRIORITY,
  softSkin: SOFT_SKIN,
  autoReview: AUTO_REVIEW,
  flashMode: FLASH_MODES,
  expCompSet: EXP_COMP_SETS,
  awbPriority: AWB_PRIORITIES,
  preAF: PRE_AF,
  steadyShot: STEADY_SHOT,
  eFrontCurtain: E_FRONT_CURTAIN,
  liveView: LIVE_VIEW,
};

const labels = content.labels as Record<string, Record<string, string>>;

test("enum lists equal the codec exports", () => {
  for (const key of Object.keys(ENUM_OPTIONS) as (keyof typeof ENUM_OPTIONS)[]) {
    const codec = CODEC[key];
    const expected = Array.isArray(codec) ? codec : Object.keys(codec);
    assert.deepEqual([...ENUM_OPTIONS[key]], [...expected], key);
  }
});

test("aperture, shutter and ISO lists equal the codec exports", () => {
  assert.deepEqual(APERTURE_OPTIONS, APERTURES);
  assert.deepEqual(SHUTTER_OPTIONS, SHUTTERS);
  assert.deepEqual(ISO_OPTIONS, ISOS.filter((x) => x !== "AUTO"));
});

test("every enum key has a label map", () => {
  for (const key of Object.keys(ENUM_OPTIONS)) {
    assert.ok(labels[key], `content.labels.${key} is missing`);
  }
});

for (const key of Object.keys(ENUM_OPTIONS) as (keyof typeof ENUM_OPTIONS)[]) {
  test(`every ${key} value has a label`, () => {
    for (const value of ENUM_OPTIONS[key]) {
      const label = labels[key]?.[value];
      assert.ok(typeof label === "string" && label.length > 0, `${key}.${value} has no label`);
    }
  });
}

test("option lists match the fixture snapshot", () => {
  const current = JSON.parse(
    JSON.stringify({
      enums: ENUM_OPTIONS,
      apertures: APERTURE_OPTIONS,
      shutters: SHUTTER_OPTIONS,
      isos: ISO_OPTIONS,
      kelvinRange: KELVIN_RANGE,
      abGmRange: AB_GM_RANGE,
    }),
  );
  if (process.env.UPDATE_SNAPSHOT === "1") fs.writeFileSync(FIXTURE, `${JSON.stringify(current, null, 2)}\n`);
  assert.deepEqual(current, JSON.parse(fs.readFileSync(FIXTURE, "utf8")));
});
