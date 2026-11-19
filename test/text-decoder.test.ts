/** TextDecoder shim: windows-1252 for "latin1" checked byte by byte against Node, UTF-8 fallback checked against Node. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeUtf8, decodeWindows1252, installTextDecoderShim, makeTextDecoder, type DecoderCtor } from "../src/core/shims/textDecoder.ts";

const NodeTextDecoder = globalThis.TextDecoder;
const nodeLatin1 = new NodeTextDecoder("latin1");
const nodeUtf8 = new NodeTextDecoder("utf-8");
const enc = (s: string) => new TextEncoder().encode(s);
const ALL_BYTES = Uint8Array.from({ length: 256 }, (_, i) => i);

test("decodeWindows1252 matches Node's latin1 decoder for every byte value", () => {
  for (let b = 0; b < 256; b++) {
    const one = Uint8Array.of(b);
    assert.equal(decodeWindows1252(one), nodeLatin1.decode(one), `byte 0x${b.toString(16)}`);
  }
  assert.equal(decodeWindows1252(ALL_BYTES), nodeLatin1.decode(ALL_BYTES));
});

test("shim latin1 label uses the table, also when a native decoder exists", () => {
  for (const Shim of [makeTextDecoder(), makeTextDecoder(NodeTextDecoder as unknown as DecoderCtor)]) {
    const dec = new Shim("latin1");
    assert.equal(dec.encoding, "windows-1252");
    assert.equal(dec.decode(ALL_BYTES), nodeLatin1.decode(ALL_BYTES));
  }
});

test("shim UTF-8 goes to the native decoder when one exists", () => {
  const dec = new (makeTextDecoder(NodeTextDecoder as unknown as DecoderCtor))();
  assert.equal(dec.encoding, "utf-8");
  assert.equal(dec.decode(enc("Chân dung 😀")), "Chân dung 😀");
});

const UTF8_SAMPLES: Uint8Array[] = [
  enc("Đời thường · Chân dung · Livestream · 6200K · €"),
  enc("😀 𝄞 \u0000\u007f"),
  Uint8Array.of(0xef, 0xbb, 0xbf, 0x41),
  Uint8Array.of(0xff),
  Uint8Array.of(0xc3),
  Uint8Array.of(0xe2, 0x82),
  Uint8Array.of(0xf0, 0x9f, 0x98),
  Uint8Array.of(0xed, 0xa0, 0x80),
  Uint8Array.of(0xc0, 0x80),
  Uint8Array.of(0xe0, 0x80, 0x80),
  Uint8Array.of(0xf4, 0x90, 0x80, 0x80),
  Uint8Array.of(0x41, 0xe2, 0x41),
];

test("decodeUtf8 matches Node's UTF-8 decoder on valid and broken samples", () => {
  UTF8_SAMPLES.forEach((bytes, i) => assert.equal(decodeUtf8(bytes), nodeUtf8.decode(bytes), `sample ${i}`));
});

test("decodeUtf8 matches Node on 3000 deterministic random byte strings", () => {
  const pool = [0x41, 0x7f, 0x80, 0x8f, 0x90, 0x9f, 0xa0, 0xbf, 0xc0, 0xc2, 0xdf, 0xe0, 0xe1, 0xec, 0xed, 0xee, 0xef, 0xf0, 0xf1, 0xf4, 0xf5, 0xff, 0xbb];
  let seed = 12345;
  const next = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed >>> 16;
  };
  for (let n = 0; n < 3000; n++) {
    const len = next() % 12;
    const bytes = Uint8Array.from({ length: len }, () => (next() % 2 ? pool[next() % pool.length] : next() & 0xff));
    assert.equal(decodeUtf8(bytes), nodeUtf8.decode(bytes), `case ${n}`);
  }
});

test("installTextDecoderShim wraps an existing native global", () => {
  const target: { TextDecoder?: unknown } = { TextDecoder: NodeTextDecoder };
  installTextDecoderShim(target);
  const Installed = target.TextDecoder as DecoderCtor;
  assert.equal(new Installed("latin1").decode(Uint8Array.of(0x80)), "€");
  assert.equal(new Installed().decode(enc("ắ")), "ắ");
});

test("installTextDecoderShim without a native global decodes UTF-8 and rejects other labels", () => {
  const target: { TextDecoder?: unknown } = {};
  installTextDecoderShim(target);
  const Installed = target.TextDecoder as DecoderCtor;
  assert.equal(new Installed().decode(enc("ắ")), "ắ");
  assert.throws(() => new Installed("shift_jis"), RangeError);
});
