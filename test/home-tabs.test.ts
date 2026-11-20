/** Preset home list: the recommended sets only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendedSets } from "../src/home/homeTabs.ts";

type Item = { id: string; unlisted?: boolean; author?: unknown; recommended?: boolean };

test("the home list shows the listed bundled sets with no author, or the recommended one", () => {
  const bundled: Item[] = [{ id: "p1" }, { id: "p2", unlisted: false }, { id: "shoot-easy", unlisted: true }];
  assert.deepEqual(recommendedSets(bundled).map((set) => set.id), ["p1", "p2"]);
});

test("an authored set is shown only when it is marked recommended, and unlisted sets never are", () => {
  const sets: Item[] = [
    { id: "rec", recommended: true, author: { name: "A" } },
    { id: "kol-1", author: { name: "B" } },
    { id: "kol-hidden", unlisted: true, author: { name: "C" } },
    { id: "plain" },
  ];
  assert.deepEqual(recommendedSets(sets).map((set) => set.id), ["rec", "plain"]);
});

test("the result is a new array", () => {
  const bundled: Item[] = [{ id: "p1" }];
  assert.notEqual(recommendedSets(bundled), bundled);
});
