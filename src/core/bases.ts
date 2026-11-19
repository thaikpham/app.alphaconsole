// DAT bases bundled from the web repo (see src/core/web/generated/datBases.ts). Pure TS, no Node or DOM APIs.
import { DAT_BASES_B64 } from "./web/generated/datBases.ts";

export type System = "pal" | "ntsc";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) t[ALPHABET.charCodeAt(i)] = i;
  return t;
})();

// Hermes has no atob/btoa guarantee, so decode base64 here.
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = LOOKUP[clean.charCodeAt(i)];
    if (v < 0) throw new Error(`base64: ký tự không hợp lệ tại ${i}`);
    buf = ((buf << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out;
}

/** Base64 with padding, the form Android's Base64.DEFAULT reads. */
export function bytesToBase64(bytes: Uint8Array): string {
  const A = ALPHABET;
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + A[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + "=";
  }
  return out;
}

const bundled = (stem: string): Uint8Array => {
  const b64 = DAT_BASES_B64[stem];
  if (!b64) throw new Error(`Thiếu file mẫu ${stem}`);
  return base64ToBytes(b64);
};

/** Base chung của hệ (zve10-base-{system}). Trả bản sao, gọi thoải mái. */
export function loadBase(system: System): Uint8Array {
  return bundled(`zve10-base-${system}`).slice();
}

/** Header 4 ô M1–M4 của hệ (zve10-{system}-m{i}), dùng khi thẻ chưa có file CAMPR nào. */
export function loadHeaders(system: System): Uint8Array[] {
  return [1, 2, 3, 4].map((i) => bundled(`zve10-${system}-m${i}`).slice());
}
