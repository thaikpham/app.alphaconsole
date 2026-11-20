/**
 * Hermes is UTF-8 only. The DAT readers in src/core/web ask for "latin1" (WHATWG: windows-1252) and for the
 * default UTF-8 decoder. This shim serves the single-byte label itself and hands UTF-8 to the engine's decoder
 * when there is one. Nothing runs at import: call installTextDecoderShim() once at startup.
 */

// Windows-1252 bytes 0x80..0x9F. Unassigned bytes (0x81, 0x8D, 0x8F, 0x90, 0x9D) map to the C1 code point, as WHATWG does.
const WINDOWS_1252_HIGH = [
  0x20ac, 0x81, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8d, 0x017d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x9d, 0x017e, 0x0178,
];

const SINGLE_BYTE_LABELS = new Set(["latin1", "iso-8859-1", "iso8859-1", "ascii", "us-ascii", "windows-1252", "cp1252"]);
const UTF8_LABELS = new Set(["utf-8", "utf8", "unicode-1-1-utf-8"]);

export type DecoderLike = {
  readonly encoding: string;
  decode(input?: ArrayBuffer | ArrayBufferView): string;
};
export type DecoderCtor = new (label?: string) => DecoderLike;

export function decodeWindows1252(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    out += String.fromCharCode(b >= 0x80 && b < 0xa0 ? WINDOWS_1252_HIGH[b - 0x80] : b);
  }
  return out;
}

/** WHATWG UTF-8 decode with U+FFFD replacement and a leading BOM stripped. Used only when the engine has no TextDecoder. */
export function decodeUtf8(bytes: Uint8Array): string {
  let i = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  let out = "";
  while (i < bytes.length) {
    const lead = bytes[i];
    if (lead < 0x80) {
      out += String.fromCharCode(lead);
      i += 1;
      continue;
    }
    let need = 0;
    let cp = 0;
    let lo = 0x80;
    let hi = 0xbf;
    if (lead >= 0xc2 && lead <= 0xdf) {
      need = 1;
      cp = lead & 0x1f;
    } else if (lead >= 0xe0 && lead <= 0xef) {
      need = 2;
      cp = lead & 0x0f;
      if (lead === 0xe0) lo = 0xa0;
      if (lead === 0xed) hi = 0x9f;
    } else if (lead >= 0xf0 && lead <= 0xf4) {
      need = 3;
      cp = lead & 0x07;
      if (lead === 0xf0) lo = 0x90;
      if (lead === 0xf4) hi = 0x8f;
    } else {
      out += "�";
      i += 1;
      continue;
    }
    let j = i + 1;
    let valid = true;
    for (let k = 0; k < need; k += 1, j += 1) {
      const next = bytes[j];
      if (next === undefined || next < lo || next > hi) {
        valid = false;
        break;
      }
      lo = 0x80;
      hi = 0xbf;
      cp = (cp << 6) | (next & 0x3f);
    }
    out += valid ? String.fromCodePoint(cp) : "�";
    i = j;
  }
  return out;
}

function toBytes(input?: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (input === undefined) return new Uint8Array(0);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  return new Uint8Array(input);
}

/** A TextDecoder constructor: windows-1252 for "latin1", the native decoder for everything else, UTF-8 fallback if there is none. */
export function makeTextDecoder(Native?: DecoderCtor): DecoderCtor {
  return class ShimTextDecoder implements DecoderLike {
    readonly encoding: string;
    private readonly native: DecoderLike | null;

    constructor(label = "utf-8") {
      const key = label.trim().toLowerCase();
      if (SINGLE_BYTE_LABELS.has(key)) {
        this.encoding = "windows-1252";
        this.native = null;
      } else if (Native) {
        this.native = new Native(label);
        this.encoding = this.native.encoding;
      } else if (UTF8_LABELS.has(key)) {
        this.encoding = "utf-8";
        this.native = null;
      } else {
        throw new RangeError(`The "${label}" encoding is not supported`);
      }
    }

    decode(input?: ArrayBuffer | ArrayBufferView): string {
      if (this.native) return this.native.decode(input);
      const bytes = toBytes(input);
      return this.encoding === "windows-1252" ? decodeWindows1252(bytes) : decodeUtf8(bytes);
    }
  };
}

/** Replaces the global TextDecoder, keeping the engine's decoder underneath. Call once at app start, before DAT code runs. */
export function installTextDecoderShim(target: { TextDecoder?: unknown } = globalThis): void {
  target.TextDecoder = makeTextDecoder(target.TextDecoder as DecoderCtor | undefined);
}
