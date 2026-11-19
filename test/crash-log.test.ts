import { test } from "node:test";
import assert from "node:assert/strict";
import { ACL_RING_CAPACITY, recentAcl, recordAcl, ringPush } from "../src/crash/ring.ts";
import {
  MAX_CRASH_ENTRIES,
  crashFileName,
  crashFilesToDelete,
  describeError,
  formatCrashEntry,
  isCrashFileName,
  parseCrashEntry,
  type CrashEntry,
} from "../src/crash/entry.ts";

const sample: CrashEntry = {
  time: "2026-11-18T10:20:30.123Z",
  appVersion: "0.9.0",
  androidVersion: "14",
  model: "Pixel 8",
  source: "js",
  message: "TypeError: boom",
  stack: "at run (app.js:1:1)",
  acl: ["ACL usb-volume 12 ms"],
};

function fileAt(second: number): string {
  return crashFileName(`2026-11-18T10:20:${String(second).padStart(2, "0")}.000Z`, "js");
}

test("ringPush keeps the newest lines and drops the oldest", () => {
  let ring: string[] = [];
  for (let i = 1; i <= 5; i++) ring = ringPush(ring, `l${i}`, 3);
  assert.deepEqual(ring, ["l3", "l4", "l5"]);
});

test("ringPush returns a new array and leaves the input alone", () => {
  const before = ["a"];
  const after = ringPush(before, "b");
  assert.deepEqual(before, ["a"]);
  assert.deepEqual(after, ["a", "b"]);
  assert.notEqual(after, before);
});

test("ring capacity is 50 lines", () => {
  assert.equal(ACL_RING_CAPACITY, 50);
  let ring: string[] = [];
  for (let i = 0; i < 51; i++) ring = ringPush(ring, `ACL ${i}`);
  assert.equal(ring.length, 50);
  assert.equal(ring[0], "ACL 1");
  assert.equal(ring[49], "ACL 50");
});

test("recordAcl keeps the newest 50 lines in module state", () => {
  for (let i = 0; i < 60; i++) recordAcl(`ACL line ${i}`);
  const lines = recentAcl();
  assert.equal(lines.length, 50);
  assert.equal(lines[0], "ACL line 10");
  assert.equal(lines[lines.length - 1], "ACL line 59");
});

test("crashFileName takes the 17 digits of the time, then the source", () => {
  assert.equal(crashFileName(sample.time, "js"), "20261118102030123-js.json");
  assert.equal(crashFileName(sample.time, "native"), "20261118102030123-native.json");
});

test("isCrashFileName accepts only names this store writes", () => {
  assert.equal(isCrashFileName("20261118102030123-js.json"), true);
  assert.equal(isCrashFileName("20261118102030123-native.json"), true);
  assert.equal(isCrashFileName("notes.txt"), false);
  assert.equal(isCrashFileName("2026-js.json"), false);
});

test("formatCrashEntry and parseCrashEntry round-trip", () => {
  assert.deepEqual(parseCrashEntry(formatCrashEntry(sample)), sample);
});

test("parseCrashEntry reads the native shape written by CrashLog.kt", () => {
  const native = JSON.stringify({
    time: "2026-11-18T10:20:30.123Z",
    appVersion: "0.9.0",
    androidVersion: "14",
    model: "Pixel 8",
    source: "native",
    message: "java.lang.RuntimeException: x",
    stack: "java.lang.RuntimeException: x\n\tat expo.Foo",
    acl: ["ACL usb-ptp 40 ms"],
  });
  const entry = parseCrashEntry(native);
  assert.equal(entry?.source, "native");
  assert.deepEqual(entry?.acl, ["ACL usb-ptp 40 ms"]);
});

test("parseCrashEntry returns null for anything that is not an entry", () => {
  assert.equal(parseCrashEntry("not json"), null);
  assert.equal(parseCrashEntry("[]"), null);
  assert.equal(parseCrashEntry("null"), null);
  assert.equal(parseCrashEntry(JSON.stringify({ ...sample, source: "other" })), null);
  assert.equal(parseCrashEntry(JSON.stringify({ ...sample, message: 1 })), null);
});

test("parseCrashEntry fills missing optional fields", () => {
  const entry = parseCrashEntry(JSON.stringify({ time: sample.time, source: "promise", message: "m" }));
  assert.deepEqual(entry, {
    time: sample.time,
    appVersion: "unknown",
    androidVersion: "unknown",
    model: "unknown",
    source: "promise",
    message: "m",
    stack: "",
    acl: [],
  });
});

test("describeError keeps the name, message, and stack of an Error", () => {
  const error = new TypeError("boom");
  assert.deepEqual(describeError(error), { message: "TypeError: boom", stack: error.stack ?? "" });
});

test("describeError handles values that are not Errors", () => {
  assert.deepEqual(describeError("oops"), { message: "oops", stack: "" });
  assert.deepEqual(describeError(Object.create(null)), { message: "unknown error", stack: "" });
});

test("crashFilesToDelete returns the oldest files beyond the limit, oldest first", () => {
  const names = Array.from({ length: 22 }, (_, i) => fileAt(i)).reverse();
  assert.deepEqual(crashFilesToDelete(names), [fileAt(0), fileAt(1)]);
});

test("crashFilesToDelete keeps 20 entries and never returns other files", () => {
  assert.equal(MAX_CRASH_ENTRIES, 20);
  const twenty = Array.from({ length: 20 }, (_, i) => fileAt(i));
  assert.deepEqual(crashFilesToDelete(twenty), []);
  assert.deepEqual(crashFilesToDelete([...twenty, "notes.txt"]), []);
  const twentyOne = Array.from({ length: 21 }, (_, i) => fileAt(i));
  assert.deepEqual(crashFilesToDelete([...twentyOne, "notes.txt"]), [fileAt(0)]);
});
