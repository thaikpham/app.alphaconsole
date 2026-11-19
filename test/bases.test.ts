/** Base64 helpers used by the native bridge: known vectors, round trip, and agreement with Node's Buffer. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { base64ToBytes, bytesToBase64 } from "../src/core/bases.ts";

const enc = (s: string) => new TextEncoder().encode(s);

test("bytesToBase64 matches the RFC 4648 vectors", () => {
  const vectors: [string, string][] = [
    ["", ""],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"],
  ];
  for (const [text, b64] of vectors) assert.equal(bytesToBase64(enc(text)), b64, text);
});

test("base64 round trip for every length from 0 to 300", () => {
  for (let len = 0; len <= 300; len++) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = (i * 73 + len * 31) & 0xff;
    assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes, `length ${len}`);
  }
});

test("bytesToBase64 agrees with Node's Buffer on all byte values", () => {
  const bytes = new Uint8Array(256 * 3);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i & 0xff;
  assert.equal(bytesToBase64(bytes), Buffer.from(bytes).toString("base64"));
});
