/**
 * Undo stack for the slot editor: the cap at HISTORY_LIMIT and the newest-first pop.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HISTORY_LIMIT, popHistory, pushHistory } from "../src/core/sets/history.ts";

test("pushHistory: keeps the last HISTORY_LIMIT snapshots and drops the oldest", () => {
  let stack: number[] = [];
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) stack = pushHistory(stack, i);
  assert.equal(stack.length, HISTORY_LIMIT);
  assert.equal(stack[0], 5);
  assert.equal(stack[stack.length - 1], HISTORY_LIMIT + 4);
});

test("pushHistory: does not mutate the input stack", () => {
  const stack = [1, 2];
  const next = pushHistory(stack, 3);
  assert.deepEqual(stack, [1, 2]);
  assert.deepEqual(next, [1, 2, 3]);
});

test("popHistory: returns the newest snapshot and the stack without it", () => {
  const result = popHistory(["a", "b", "c"]);
  assert.deepEqual(result, { stack: ["a", "b"], snapshot: "c" });
});

test("popHistory: does not mutate the input stack", () => {
  const stack = ["a", "b"];
  popHistory(stack);
  assert.deepEqual(stack, ["a", "b"]);
});

test("popHistory: an empty stack returns null", () => {
  assert.equal(popHistory([]), null);
});
