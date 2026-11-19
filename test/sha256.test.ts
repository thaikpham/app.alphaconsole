/** sha256: the plain TS version matches node:crypto on edge lengths around the 55/56/64-byte padding boundaries. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { sha256Hex } from "../src/core/transfer/sha256.ts";

test("empty input and the standard abc vector", () => {
  assert.equal(sha256Hex(new Uint8Array()), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex(new TextEncoder().encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("matches node:crypto for lengths around the padding boundaries", () => {
  for (const len of [1, 55, 56, 57, 63, 64, 65, 119, 120, 4608]) {
    const data = new Uint8Array(randomBytes(len));
    const expected = createHash("sha256").update(data).digest("hex");
    assert.equal(sha256Hex(data), expected, `length ${len}`);
  }
});
