/** Preset home tabs: the route's tab param and the sets each tab shows. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHomeTab, tabSets } from "../src/home/homeTabs.ts";

type Item = { id: string; unlisted?: boolean };
const bundled: Item[] = [
  { id: "p1" },
  { id: "p2", unlisted: false },
  { id: "shoot-easy", unlisted: true },
];
const mine: Item[] = [{ id: "mine-1" }, { id: "mine-2" }];

test("the tab param selects Của tôi only for 'mine'; anything else is recommended", () => {
  assert.equal(parseHomeTab("mine"), "mine");
  assert.equal(parseHomeTab(["mine", "x"]), "mine");
  assert.equal(parseHomeTab("recommended"), "recommended");
  assert.equal(parseHomeTab("kol"), "kol");
  assert.equal(parseHomeTab(undefined), "recommended");
  assert.equal(parseHomeTab([]), "recommended");
});

test("Khuyên dùng lists the listed bundled sets with no author, or the recommended one", () => {
  assert.deepEqual(tabSets("recommended", bundled, mine).map((set) => set.id), ["p1", "p2"]);
});

test("KOL lists the listed bundled sets that have an author and are not recommended", () => {
  const authored = [
    { id: "rec", recommended: true, author: { name: "A" } },
    { id: "kol-1", author: { name: "B" } },
    { id: "kol-hidden", unlisted: true, author: { name: "C" } },
    { id: "plain" },
  ];
  assert.deepEqual(tabSets("kol", authored, mine).map((set) => set.id), ["kol-1"]);
});

test("Của tôi lists the user's sets and does not return the caller's array", () => {
  const shown = tabSets("mine", bundled, mine);
  assert.deepEqual(shown.map((set) => set.id), ["mine-1", "mine-2"]);
  assert.notEqual(shown, mine);
});
