/** Mount wait: reads at once after a mass-storage attach, polls slowly, and ends on found, stop, or the time limit. */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// mountWait.ts and tokens.ts import their siblings without extensions. Resolve them to .ts, as theme.test.ts does.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (relative && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

// Dynamic imports run after registerHooks. Static imports are hoisted above it.
const { createMountWait } = await import("../src/card/mountWait.ts");
const { timing } = await import("../src/ui/tokens.ts");
const MOUNT_POLL_MS = timing.mountPollMs;
const MOUNT_WAIT_MS = timing.mountWaitMs;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Fake setInterval and setTimeout only. Promises are not faked, so flush() lets a read's result arrive. */
function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const reads: string[] = [];
  const logs: string[] = [];
  const card = { found: false };
  const wait = createMountWait({
    read: async (trigger) => {
      reads.push(trigger);
    },
    found: () => card.found,
    log: (message) => logs.push(message),
  });
  return { wait, reads, logs, card, timers: t.mock.timers };
}

test("start reads at once and is waiting", (t) => {
  const { wait, reads } = setup(t);
  wait.start();
  assert.deepEqual(reads, ["usbAttach"]);
  assert.equal(wait.isWaiting(), true);
});

test("while no card is found it polls every 2 s", (t) => {
  const { wait, reads, timers } = setup(t);
  wait.start();
  timers.tick(MOUNT_POLL_MS - 1);
  assert.deepEqual(reads, ["usbAttach"]);
  timers.tick(1);
  assert.deepEqual(reads, ["usbAttach", "mountPoll"]);
  timers.tick(MOUNT_POLL_MS);
  assert.deepEqual(reads, ["usbAttach", "mountPoll", "mountPoll"]);
});

test("the wait ends at 60 s and no polls follow", (t) => {
  const { wait, reads, logs, timers } = setup(t);
  wait.start();
  timers.tick(MOUNT_WAIT_MS);
  assert.equal(wait.isWaiting(), false);
  assert.ok(logs.includes("mount wait end timeout"));
  const count = reads.length;
  timers.tick(10 * MOUNT_POLL_MS);
  assert.equal(reads.length, count);
});

test("a read that finds the card ends the wait and stops the poll", async (t) => {
  const { wait, reads, logs, card, timers } = setup(t);
  wait.start();
  await flush();
  assert.equal(wait.isWaiting(), true);

  card.found = true;
  timers.tick(MOUNT_POLL_MS);
  await flush();
  assert.equal(wait.isWaiting(), false);
  assert.ok(logs.includes("mount wait end found"));

  const count = reads.length;
  timers.tick(MOUNT_WAIT_MS);
  assert.equal(reads.length, count);
});

test("a card found by the first read ends the wait at once", async (t) => {
  const { wait, reads, card, timers } = setup(t);
  card.found = true;
  wait.start();
  await flush();
  assert.equal(wait.isWaiting(), false);
  timers.tick(MOUNT_POLL_MS);
  assert.deepEqual(reads, ["usbAttach"]);
});

test("a volume change while waiting reads at once", async (t) => {
  const { wait, reads, logs } = setup(t);
  wait.start();
  await flush();
  wait.volumeChanged("mounted");
  assert.deepEqual(reads, ["usbAttach", "volumeChanged"]);
  assert.ok(logs.includes("volume mounted"));
});

test("a volume change while idle does nothing", (t) => {
  const { wait, reads, logs } = setup(t);
  wait.volumeChanged("mounted");
  assert.deepEqual(reads, []);
  assert.deepEqual(logs, []);
});

test("a volume change after the wait ends does nothing", async (t) => {
  const { wait, reads, card } = setup(t);
  card.found = true;
  wait.start();
  await flush();
  const count = reads.length;
  wait.volumeChanged("mounted");
  assert.equal(reads.length, count);
});

test("stop ends the wait and stops the poll", (t) => {
  const { wait, reads, logs, timers } = setup(t);
  wait.start();
  wait.stop();
  assert.equal(wait.isWaiting(), false);
  assert.ok(logs.includes("mount wait end stop"));
  const count = reads.length;
  timers.tick(MOUNT_WAIT_MS);
  assert.equal(reads.length, count);
});

test("stop while idle does nothing", (t) => {
  const { wait, logs } = setup(t);
  wait.stop();
  assert.deepEqual(logs, []);
});

test("a new start while waiting restarts the 60 s budget", (t) => {
  const { wait, timers } = setup(t);
  wait.start();
  timers.tick(MOUNT_WAIT_MS - MOUNT_POLL_MS);
  wait.start();
  timers.tick(MOUNT_WAIT_MS - 1);
  assert.equal(wait.isWaiting(), true, "the first budget would have ended by now");
  timers.tick(1);
  assert.equal(wait.isWaiting(), false);
});

test("subscribers hear only real changes of the waiting state", (t) => {
  const { wait } = setup(t);
  let heard = 0;
  const off = wait.subscribe(() => {
    heard++;
  });
  wait.start();
  assert.equal(heard, 1);
  wait.start();
  assert.equal(heard, 1, "a start while already waiting changes nothing");
  wait.stop();
  assert.equal(heard, 2);
  wait.stop();
  assert.equal(heard, 2, "a stop while idle changes nothing");
  off();
  wait.start();
  assert.equal(heard, 2, "an unsubscribed listener is not called");
});

test("a card found during the wait notifies subscribers so the screen leaves mounting", async (t) => {
  const { wait, card, timers } = setup(t);
  let heard = 0;
  wait.subscribe(() => {
    heard++;
  });
  wait.start();
  await flush();
  assert.equal(heard, 1);
  card.found = true;
  timers.tick(MOUNT_POLL_MS);
  await flush();
  assert.equal(wait.isWaiting(), false);
  assert.equal(heard, 2);
});
