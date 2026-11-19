import { test } from "node:test";
import assert from "node:assert/strict";
import { usbHint } from "../src/write/usbHint.ts";

const massStorage = { mode: "mass-storage" as const };
const ptp = { mode: "ptp" as const };
const unknown = { mode: "unknown" as const };

test("write: camera in PTP asks to turn PC Remote off", () => {
  assert.equal(usbHint("write", ptp), "ptpOff");
});

test("write: unplugged right after PTP asks for the cable to be plugged in again", () => {
  assert.equal(usbHint("write", null, true), "replug");
});

test("write: unplugged without a PTP drop shows no hint", () => {
  assert.equal(usbHint("write", null), null);
});

test("write: mass-storage, unknown and checking show no hint", () => {
  assert.equal(usbHint("write", massStorage), null);
  assert.equal(usbHint("write", massStorage, true), null);
  assert.equal(usbHint("write", unknown), null);
  assert.equal(usbHint("write", "checking"), null);
});

test("preview: mass-storage, unknown and no camera ask to turn PC Remote on", () => {
  assert.equal(usbHint("preview", massStorage), "pcRemoteOn");
  assert.equal(usbHint("preview", unknown), "pcRemoteOn");
  assert.equal(usbHint("preview", null), "pcRemoteOn");
});

test("preview: camera in PTP and checking show no hint", () => {
  assert.equal(usbHint("preview", ptp), null);
  assert.equal(usbHint("preview", "checking"), null);
});
