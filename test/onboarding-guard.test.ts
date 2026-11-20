/** Root guard rules: first-launch redirect, the access gate and its deferral, and route groups. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { exitRoute, guardTarget, routeOf, type GuardInput } from "../src/onboarding/guardRule.ts";

const base: GuardInput = {
  seen: true,
  accessChecked: true,
  access: true,
  deferred: false,
  gateOnLoad: true,
  route: "home",
};
const run = (patch: Partial<GuardInput>) => guardTarget({ ...base, ...patch });

test("route groups come from the segments, with the index route as home", () => {
  assert.equal(routeOf([]), "home");
  assert.equal(routeOf(["index"]), "home");
  assert.equal(routeOf(["onboarding", "device"]), "device");
  assert.equal(routeOf(["onboarding", "intro"]), "intro");
  assert.equal(routeOf(["onboarding", "access"]), "access");
  assert.equal(routeOf(["onboarding"]), "app");
  assert.equal(routeOf(["sets"]), "app");
  assert.equal(routeOf(["sets", "[id]", "edit"]), "app");
});

test("nothing happens while the first-launch flag is loading", () => {
  assert.equal(run({ seen: null, route: "home" }), null);
  assert.equal(run({ seen: null, accessChecked: false, route: "access" }), null);
});

test("before onboarding is seen, every screen but device and intro goes to the device pick", () => {
  assert.equal(run({ seen: false, route: "home" }), "/onboarding/device");
  assert.equal(run({ seen: false, route: "app" }), "/onboarding/device");
  assert.equal(run({ seen: false, route: "access" }), "/onboarding/device");
  assert.equal(run({ seen: false, route: "device" }), null);
  assert.equal(run({ seen: false, route: "intro" }), null);
});

test("refused access shows the gate on app screens until it is deferred", () => {
  assert.equal(run({ access: false, route: "home" }), "/onboarding/access");
  assert.equal(run({ access: false, route: "app" }), "/onboarding/access");
  assert.equal(run({ access: false, deferred: true, route: "home" }), null);
});

test("the gate stays while refused and leaves once granted or deferred", () => {
  assert.equal(run({ access: false, route: "access" }), null);
  assert.equal(run({ access: true, route: "access" }), "/");
  assert.equal(run({ access: false, deferred: true, route: "access" }), "/");
});

test("an access check that is still running or failed does not gate the app", () => {
  assert.equal(run({ accessChecked: false, access: null, route: "home" }), null);
  assert.equal(run({ accessChecked: true, access: null, route: "home" }), null);
  assert.equal(run({ accessChecked: true, access: null, route: "access" }), "/");
});

test("intro stays reachable from the overflow even while access is refused", () => {
  assert.equal(run({ access: false, route: "intro" }), null);
  assert.equal(run({ access: false, route: "device" }), null);
});

test("on the web the access gate never shows on load, so deep links render directly", () => {
  const web = { gateOnLoad: false, access: false };
  assert.equal(run({ ...web, route: "home" }), null);
  assert.equal(run({ ...web, route: "app" }), null);
  assert.equal(run({ ...web, route: "access" }), "/");
});

test("on the web the first-launch redirect still applies to deep links", () => {
  assert.equal(run({ gateOnLoad: false, seen: false, route: "app" }), "/onboarding/device");
  assert.equal(run({ gateOnLoad: false, seen: false, route: "device" }), null);
});

test("leaving the gate returns to the route it interrupted, or home", () => {
  assert.equal(exitRoute("/", "/sets/zv-e10-hybrid/edit"), "/sets/zv-e10-hybrid/edit");
  assert.equal(exitRoute("/", null), "/");
  assert.equal(exitRoute("/onboarding/access", "/sets/zv-e10-hybrid/edit"), "/onboarding/access");
});
