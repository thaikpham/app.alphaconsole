/**
 * Duplicate then load: the copy is listed by the next load at once, through the same store and through a fresh store
 * over the same file. Uses a real temp file, because the app's adapter is file-backed (storage/userSetsFile.ts).
 */
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSetStore, type SetsAdapter } from "../src/core/sets/store.ts";
import { defaultSet, validatePresetSets } from "../src/core/web/lib/presetSets.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundled = validatePresetSets(JSON.parse(fs.readFileSync(path.join(ROOT, "src/core/web/data/preset-sets.json"), "utf8")));
const shippedId = defaultSet(bundled).id;
const LOAD_TIMEOUT_MS = 5000;

const dirs: string[] = [];

function tempFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acl-dup-"));
  dirs.push(dir);
  return path.join(dir, "user-sets.json");
}

function fileAdapter(file: string): SetsAdapter {
  return {
    read: async () => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null),
    write: async (text) => fs.writeFileSync(file, text, "utf8"),
  };
}

after(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("duplicate then load", () => {
  test("a bundled set's copy is loaded at once by the same store", { timeout: LOAD_TIMEOUT_MS }, async () => {
    const store = createSetStore(fileAdapter(tempFile()), bundled);
    const copy = await store.duplicate(shippedId);
    const { user } = await store.load();
    const found = user.find((s) => s.id === copy.id);
    assert.ok(found, "copy is listed");
    assert.equal(found.slots.length, 4);
    assert.deepEqual(found, copy);
  });

  test("a bundled set's copy is loaded at once by a fresh store over the same file", { timeout: LOAD_TIMEOUT_MS }, async () => {
    const file = tempFile();
    const copy = await createSetStore(fileAdapter(file), bundled).duplicate(shippedId);
    const { user } = await createSetStore(fileAdapter(file), bundled).load();
    const found = user.find((s) => s.id === copy.id);
    assert.ok(found, "copy is listed");
    assert.equal(found.slots.length, 4);
    assert.deepEqual(found, copy);
  });

  test("a copy of a user set is loaded at once, with a new id", { timeout: LOAD_TIMEOUT_MS }, async () => {
    const file = tempFile();
    const store = createSetStore(fileAdapter(file), bundled);
    const first = await store.duplicate(shippedId);
    const second = await store.duplicate(first.id);
    assert.notEqual(second.id, first.id);
    const { user } = await createSetStore(fileAdapter(file), bundled).load();
    assert.deepEqual(
      user.map((s) => s.id),
      [first.id, second.id],
    );
  });
});
