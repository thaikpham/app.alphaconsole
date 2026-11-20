/** Root guard rules: first-launch redirect and route groups. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { guardTarget, routeOf, type GuardInput } from "../src/onboarding/guardRule.ts";

const base: GuardInput = { seen: true, route: "home" };
const run = (patch: Partial<GuardInput>) => guardTarget({ ...base, ...patch });

test("route groups come from the segments, with the index route as home", () => {
  assert.equal(routeOf([]), "home");
  assert.equal(routeOf(["index"]), "home");
  assert.equal(routeOf(["onboarding", "device"]), "device");
  assert.equal(routeOf(["onboarding", "intro"]), "intro");
  assert.equal(routeOf(["onboarding"]), "app");
  assert.equal(routeOf(["sets"]), "app");
  assert.equal(routeOf(["sets", "[id]", "edit"]), "app");
});

test("nothing happens while the first-launch flag is loading", () => {
  assert.equal(run({ seen: null, route: "home" }), null);
  assert.equal(run({ seen: null, route: "app" }), null);
});

test("before onboarding is seen, every screen but device and intro goes to the device pick", () => {
  assert.equal(run({ seen: false, route: "home" }), "/onboarding/device");
  assert.equal(run({ seen: false, route: "app" }), "/onboarding/device");
  assert.equal(run({ seen: false, route: "device" }), null);
  assert.equal(run({ seen: false, route: "intro" }), null);
});

test("once onboarding is seen the guard never redirects", () => {
  for (const route of ["home", "device", "intro", "app"] as const) {
    assert.equal(run({ seen: true, route }), null);
  }
});
