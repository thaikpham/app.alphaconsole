/**
 * Sony α6400 (ILCE-6400, Legacy Menu) Memory Recall DAT — bộ giải mã CHỈ ĐỌC, thử nghiệm.
 * Checksum 0x38 và bản đồ offset được suy ra từ 5 file máy thật (test/fixtures/a6400/).
 * Không có hàm ghi: α6400 chưa được hỗ trợ tạo file.
 * Enum và công thức APEX/ISO dùng chung với ZV-E10 (lib/zve10/dat.ts).
 */

import { APERTURES, ISOS, PROFILE, SHUTTERS, apexU16, avThirds, tvThirds } from "../zve10/dat.ts";

export const A6400_MODEL = "ILCE-6400";
const SIZE = 4608;

// Bản đồ offset ZV-E10 → α6400 (trainer README). Khoảng 0x2DE chưa xác nhận nên không ánh xạ.
const LAYOUT: readonly [number, number, number][] = [
  [0x3c, 0x2dd, 0],
  [0x2df, 0x489, 1],
  [0x48a, 0x48f, 0],
  [0x491, 0x7aa, -2],
];

export function toA6400Offset(zveOffset: number): number {
  for (const [start, end, shift] of LAYOUT) {
    if (zveOffset >= start && zveOffset <= end) return zveOffset + shift;
  }
  throw new Error(`Chưa có ánh xạ α6400 cho offset 0x${zveOffset.toString(16)}`);
}

function readLE(b: Uint8Array, off: number, width: 1 | 2): number {
  return width === 1 ? b[off] : b[off] + 256 * b[off + 1];
}

function enumKey(values: Record<string, number>, raw: number): string | null {
  return Object.entries(values).find(([, v]) => v === raw)?.[0] ?? null;
}

function isoCode(label: string): number {
  const iso = PROFILE.exposure.iso;
  return label === "AUTO" ? (iso.auto ?? 0) : (iso.base ?? 11) + Math.round(3 * Math.log2(parseInt(label, 10) / 100));
}

// Mỗi trường: offset gốc ZV-E10, độ rộng, giá trị đã thấy trong 5 file máy thật (observed), bộ giải mã.
type Spec = {
  zve: number;
  width: 1 | 2;
  observed: readonly (string | number)[];
  decode: (raw: number) => string | number | null;
};

const PP1 = (fieldIndex: number) => 0x317 + 14 * fieldIndex;

// Trường PP1 số: byte có dấu như ZV-E10 (rule.signed). knee_auto_max/knee_point dùng công thức (raw + b) * 5/2 của ZV-E10.
const ppSigned = (r: number) => (r >= 128 ? r - 256 : r);
const ppKnee = (b: number) => (r: number) => ((ppSigned(r) + b) * 5) / 2;
const ppInt = (index: number, observed: number[]): Spec => ({ zve: PP1(index), width: 1, observed, decode: ppSigned });
const ppEnum = (index: number, observed: string[], values: Record<string, number>): Spec => ({ zve: PP1(index), width: 1, observed, decode: (r) => enumKey(values, r) });

const SPEC = {
  mode: {
    zve: PROFILE.shoot_offsets[0] as number,
    width: 1,
    observed: ["M"],
    decode: (r) => enumKey(PROFILE.shoot_modes, r),
  },
  aperture: {
    zve: PROFILE.exposure.aperture.apex_offsets[0] as number,
    width: 2,
    observed: ["5.6", "8", "11"],
    decode: (r) => APERTURES.find((x) => apexU16(avThirds(x)) === r) ?? null,
  },
  shutter: {
    zve: PROFILE.exposure.shutter.apex_offsets[0] as number,
    width: 2,
    observed: ["1/60", "1/125", "1/250"],
    decode: (r) => SHUTTERS.find((x) => apexU16(tvThirds(x)) === r) ?? null,
  },
  iso: {
    zve: PROFILE.exposure.iso.offsets[0] as number,
    width: 1,
    observed: ["AUTO", "400", "800", "1600"],
    decode: (r) => ISOS.find((x) => isoCode(x) === r) ?? null,
  },
  wbMode: {
    zve: 0x19a,
    width: 1,
    observed: ["ctemp", "awb"],
    decode: (r) => ({ 14: "ctemp", 1: "awb" } as Record<number, string>)[r] ?? null,
  },
  kelvin: {
    zve: 0x1d8,
    width: 1,
    observed: [4300, 5500],
    decode: (r) => r * 100,
  },
  ppGamma: {
    zve: PP1(1),
    width: 1,
    observed: ["Movie", "Cine3", "Still", "Cine2"],
    decode: (r) => enumKey(PROFILE.pp.gamma.values, r),
  },
  ppColorMode: {
    zve: PP1(9),
    width: 1,
    observed: ["Movie", "Cinema", "Pro", "ITU709 Matrix"],
    decode: (r) => enumKey(PROFILE.pp.color_mode.values, r),
  },
  ppBlackLevel: {
    zve: PP1(0),
    width: 1,
    observed: [0, 5, -5],
    decode: (r) => (r >= 128 ? r - 256 : r),
  },
  ppBlackGammaRange: ppEnum(2, ["Middle", "Narrow"], PROFILE.pp.black_gamma_range.values),
  ppBlackGammaLevel: ppInt(3, [0, -3, 2]),
  ppKneeMode: ppEnum(4, ["Auto", "Manual"], PROFILE.pp.knee_mode.values),
  ppKneeAutoMax: { zve: PP1(5), width: 1, observed: [100, 97.5, 95], decode: ppKnee(36) },
  ppKneeAutoSens: ppEnum(6, ["Mid", "Low", "High"], PROFILE.pp.knee_auto_sens.values),
  ppKneePoint: { zve: PP1(7), width: 1, observed: [95, 85], decode: ppKnee(30) },
  ppKneeSlope: ppInt(8, [0, -2, 2]),
  ppSaturation: ppInt(10, [0, 12, -12]),
  ppColorPhase: ppInt(11, [0, -3, 2]),
  ppDepthR: ppInt(12, [0, 1, -2]),
  ppDepthG: ppInt(13, [0, 2, -3]),
  ppDepthB: ppInt(14, [0, -1, 3]),
  ppDepthC: ppInt(15, [0, -4, 3]),
  ppDepthM: ppInt(16, [0, 5, -5]),
  ppDepthY: ppInt(17, [0, -6, 1]),
  ppDetailLevel: ppInt(18, [0, 3, -2]),
  ppDetailMode: ppEnum(19, ["Auto", "Manual"], PROFILE.pp.detail_mode.values),
  ppDetailVh: ppInt(20, [0, -1, 1]),
  ppDetailBw: ppEnum(21, ["Type3", "Type4", "Type1"], PROFILE.pp.detail_bw.values),
  ppDetailLimit: ppInt(22, [7, 3, 5]),
  ppDetailCrisp: ppInt(23, [0, 2, 4]),
  ppDetailHilight: ppInt(24, [0, 1, 3]),
} satisfies Record<string, Spec>;

export type A6400FieldKey = keyof typeof SPEC;

export const A6400_FIELDS = (Object.keys(SPEC) as A6400FieldKey[]).map((key) => ({
  key,
  zveOffset: SPEC[key].zve,
  a6400Offset: toA6400Offset(SPEC[key].zve),
  width: SPEC[key].width,
  observed: SPEC[key].observed,
}));

// Checksum byte 0x38 của α6400: như ZV-E10 nhưng bỏ byte 0x5D1 (AWB Priority) và cộng 0x81.
// Quy tắc khớp đúng cả 5 file máy thật; chưa kiểm chứng trên mẫu khác.
export function a6400Checksum38(bytes: Uint8Array): number {
  let sum = 0;
  for (let o = 0x39; o < 0x1000; o++) {
    if (o === 0x5d1) continue;
    sum += bytes[o] << ((o - 0x39) % 8);
  }
  return (sum + 0x81) & 255;
}

export interface A6400Header {
  model: string;
  date: string;
  name: string;
}

export function parseA6400(bytes: Uint8Array): A6400Header {
  if (bytes.length !== SIZE) throw new Error("Cần file Memory Recall SONY! của α6400, dài 4.608 byte.");
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== "SONY!") throw new Error("Không phải file Memory Recall SONY!.");
  const end = bytes.indexOf(0, 5);
  const model = String.fromCharCode(...bytes.subarray(5, end === -1 || end > 0x14 ? 0x14 : end));
  if (model !== A6400_MODEL) throw new Error(`File này không phải α6400 (model: ${model}).`);
  if (bytes[0x38] !== a6400Checksum38(bytes)) throw new Error("Sai checksum byte 0x38 của α6400.");
  return {
    model,
    date: String.fromCharCode(...bytes.subarray(0x15, 0x24)).replace(/\0.*$/, ""),
    name: String.fromCharCode(...bytes.subarray(0x28, 0x34)).replace(/\0.*$/, ""),
  };
}

export interface A6400Value {
  value: string | number | null;
  offset: number;
  // true chỉ khi giá trị đã xuất hiện trong file máy thật (A6400_FIELDS[].observed)
  confirmed: boolean;
}

export interface A6400Decoded extends A6400Header {
  fields: Record<A6400FieldKey, A6400Value>;
}

export function decodeA6400(bytes: Uint8Array): A6400Decoded {
  const header = parseA6400(bytes);
  const fields = {} as Record<A6400FieldKey, A6400Value>;
  for (const key of Object.keys(SPEC) as A6400FieldKey[]) {
    const spec = SPEC[key];
    const offset = toA6400Offset(spec.zve);
    const value = spec.decode(readLE(bytes, offset, spec.width));
    fields[key] = { value, offset, confirmed: value !== null && (spec.observed as readonly unknown[]).includes(value) };
  }
  // Nhiệt độ màu chỉ có nghĩa khi WB là C.Temp (cùng quy ước ZV-E10).
  if (fields.wbMode.value !== "ctemp") fields.kelvin = { value: null, offset: fields.kelvin.offset, confirmed: false };
  return { ...header, fields };
}
