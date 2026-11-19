/** Card reader: one read at a time, coalesced triggers, last reading kept while a read runs. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCardReader } from "../src/card/reader.ts";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

type Gate<T> = { promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void };

function gate<T>(): Gate<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A reader whose reads wait on gates the test resolves, in the order the reads start. */
function gatedReader() {
  const calls: { gate: Gate<string> }[] = [];
  const reader = createCardReader<string>({
    read: () => {
      const g = gate<string>();
      calls.push({ gate: g });
      return g.promise;
    },
    detached: "absent",
  });
  return { reader, calls };
}

test("one request runs one read and publishes its result", async () => {
  const reader = createCardReader<string>({ read: async () => "A", detached: "absent" });
  await reader.request("focus");
  assert.deepEqual(reader.getState(), { reading: "A", busy: false, failure: null });
});

test("busy is true from the request until the read ends", async () => {
  const { reader, calls } = gatedReader();
  const done = reader.request("focus");
  assert.equal(reader.getState().busy, true);
  calls[0].gate.resolve("A");
  await done;
  assert.equal(reader.getState().busy, false);
});

test("triggers during a read join one trailing read, not one read each", async () => {
  const { reader, calls } = gatedReader();
  const first = reader.request("focus");
  reader.request("appstate");
  reader.request("focus");
  const last = reader.request("picker");
  assert.equal(last, first, "joined requests share the drain promise");
  assert.equal(calls.length, 1);

  calls[0].gate.resolve("old");
  await tick();
  assert.equal(calls.length, 2, "one trailing read after the running one");

  calls[1].gate.resolve("new");
  await first;
  assert.equal(calls.length, 2);
  assert.equal(reader.getState().reading, "new");
});

test("the result of a read that a newer request supersedes is not published", async () => {
  const { reader, calls } = gatedReader();
  const done = reader.request("focus");
  reader.request("appstate");
  calls[0].gate.resolve("old");
  await tick();
  assert.equal(reader.getState().reading, null, "old result must not reach the screen");

  calls[1].gate.resolve("new");
  await done;
  assert.equal(reader.getState().reading, "new");
});

test("the last reading stays on screen while a read runs (stale-while-revalidate)", async () => {
  const { reader, calls } = gatedReader();
  const first = reader.request("focus");
  calls[0].gate.resolve("A");
  await first;

  const second = reader.request("focus");
  const during = reader.getState();
  assert.equal(during.reading, "A", "cached reading is not cleared by a new read");
  assert.equal(during.busy, true);
  calls[1].gate.resolve("B");
  await second;
  assert.equal(reader.getState().reading, "B");
});

test("detach drops the running read and the queued one, and shows the detached reading at once", async () => {
  const { reader, calls } = gatedReader();
  const done = reader.request("focus");
  reader.request("appstate");
  reader.detach();
  assert.deepEqual(reader.getState(), { reading: "absent", busy: false, failure: null });

  calls[0].gate.resolve("stale");
  await done;
  assert.equal(calls.length, 1, "queued read is dropped");
  assert.equal(reader.getState().reading, "absent", "stale result must not overwrite the detach");
  assert.equal(reader.getState().busy, false);
});

test("a request after detach starts a fresh read that does publish", async () => {
  const { reader, calls } = gatedReader();
  const old = reader.request("focus");
  reader.detach();
  const fresh = reader.request("usbAttach");
  calls[0].gate.resolve("stale");
  await tick();
  calls[1].gate.resolve("ready");
  await Promise.all([old, fresh]);
  assert.equal(reader.getState().reading, "ready");
});

test("a failed read keeps the last reading, reports the error, and the next success clears it", async () => {
  const { reader, calls } = gatedReader();
  const first = reader.request("focus");
  calls[0].gate.resolve("A");
  await first;

  const failing = reader.request("focus");
  const boom = new Error("boom");
  calls[1].gate.reject(boom);
  await failing;
  assert.deepEqual(reader.getState(), { reading: "A", busy: false, failure: { error: boom } });

  const ok = reader.request("focus");
  calls[2].gate.resolve("B");
  await ok;
  assert.deepEqual(reader.getState(), { reading: "B", busy: false, failure: null });
});

test("subscribers hear every state change and can unsubscribe", async () => {
  const reader = createCardReader<string>({ read: async () => "A", detached: "absent" });
  let heard = 0;
  const off = reader.subscribe(() => {
    heard++;
  });
  await reader.request("focus");
  assert.ok(heard >= 2, "busy on, then reading and busy off");
  off();
  const before = heard;
  await reader.request("focus");
  assert.equal(heard, before);
});

test("log lines name the trigger and whether the request joined", async () => {
  const lines: string[] = [];
  const gates: Gate<string>[] = [];
  const reader = createCardReader<string>({
    read: () => {
      const g = gate<string>();
      gates.push(g);
      return g.promise;
    },
    detached: "absent",
    log: (m) => lines.push(m),
  });
  const done = reader.request("usbAttach");
  reader.request("picker");
  assert.ok(lines.some((l) => l.includes("request usbAttach") && l.includes("started")));
  assert.ok(lines.some((l) => l.includes("request picker") && l.includes("joined")));

  gates[0].resolve("A");
  await tick();
  gates[1].resolve("B");
  await done;
  assert.ok(lines.some((l) => l.startsWith("read ") && l.includes("dropped=true")));
});
