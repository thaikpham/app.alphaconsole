/**
 * User set store, with an in-memory adapter: round trip, corrupt file, id uniqueness, rename and remove,
 * and bundled sets that cannot be written.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSetStore,
  parseUserSetsFile,
  serializeUserSetsFile,
  StoreError,
  uniqueSetId,
  type SetsAdapter,
} from "../src/core/sets/store.ts";
import { defaultSet, validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundled = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const shippedId = defaultSet(bundled).id;

function memoryAdapter(initial: string | null = null) {
  let text = initial;
  const writes: string[] = [];
  const adapter: SetsAdapter = {
    read: async () => text,
    write: async (t) => {
      writes.push(t);
      text = t;
    },
  };
  return { adapter, writes, text: () => text };
}

describe("round trip", () => {
  test("duplicate, save, and load keep the set, and the file re-serializes to the same text", async () => {
    const mem = memoryAdapter();
    const store = createSetStore(mem.adapter, bundled);
    const copy = await store.duplicate(shippedId);
    assert.equal(copy.recommended, undefined);
    assert.equal(copy.unlisted, undefined);
    assert.equal(copy.author, undefined);

    await store.save({ ...copy, description: "Ghi chú" });
    const { user } = await store.load();
    assert.equal(user.length, 1);
    assert.equal(user[0]?.id, copy.id);
    assert.equal(user[0]?.description, "Ghi chú");

    const text = mem.text();
    assert.ok(text !== null);
    assert.equal(serializeUserSetsFile(parseUserSetsFile(text)), text);
  });
});

describe("corrupt file", () => {
  for (const text of ["{not json", '{"version":2,"sets":[]}', '{"version":1}', '{"version":1,"sets":[{"set":null}]}']) {
    test(`${text} is refused and never overwritten`, async () => {
      const mem = memoryAdapter(text);
      const store = createSetStore(mem.adapter, bundled);
      await assert.rejects(store.load(), StoreError);
      await assert.rejects(store.duplicate(shippedId), StoreError);
      await assert.rejects(store.remove("khong-co"), StoreError);
      assert.equal(mem.writes.length, 0);
      assert.equal(mem.text(), text);
    });
  }
});

describe("ids", () => {
  test("a second copy of the same set gets a -2 suffix", async () => {
    const store = createSetStore(memoryAdapter().adapter, bundled);
    const first = await store.duplicate(shippedId);
    const second = await store.duplicate(shippedId);
    assert.notEqual(first.id, second.id);
    assert.equal(second.id, `${first.id}-2`);
  });

  test("uniqueSetId adds -2, then -3", () => {
    assert.equal(uniqueSetId("Abc", new Set()), "abc");
    assert.equal(uniqueSetId("Abc", new Set(["abc"])), "abc-2");
    assert.equal(uniqueSetId("Abc", new Set(["abc", "abc-2"])), "abc-3");
  });
});

describe("rename and remove", () => {
  test("rename trims the name and remove deletes the set", async () => {
    const store = createSetStore(memoryAdapter().adapter, bundled);
    const copy = await store.duplicate(shippedId);

    await store.rename(copy.id, "  Bộ mới  ");
    assert.equal((await store.load()).user[0]?.name, "Bộ mới");

    await store.remove(copy.id);
    assert.deepEqual((await store.load()).user, []);
  });

  test("rename rejects an empty name", async () => {
    const store = createSetStore(memoryAdapter().adapter, bundled);
    const copy = await store.duplicate(shippedId);
    await assert.rejects(store.rename(copy.id, "   "), StoreError);
  });
});

describe("bundled sets are read-only", () => {
  test("save, rename, and remove refuse a bundled set", async () => {
    const mem = memoryAdapter();
    const store = createSetStore(mem.adapter, bundled);
    const shipped = defaultSet(bundled);
    await assert.rejects(store.save(shipped), StoreError);
    await assert.rejects(store.rename(shipped.id, "Đổi"), StoreError);
    await assert.rejects(store.remove(shipped.id), StoreError);
    assert.equal(mem.writes.length, 0);
  });

  test("an unknown id is refused", async () => {
    const store = createSetStore(memoryAdapter().adapter, bundled);
    await assert.rejects(store.remove("khong-co"), StoreError);
    await assert.rejects(store.duplicate("khong-co"), StoreError);
  });
});

test("save rejects an invalid set and writes nothing", async () => {
  const mem = memoryAdapter();
  const store = createSetStore(mem.adapter, bundled);
  const copy = await store.duplicate(shippedId);
  const writesBefore = mem.writes.length;
  await assert.rejects(store.save({ ...copy, name: "" }), StoreError);
  assert.equal(mem.writes.length, writesBefore);
});
