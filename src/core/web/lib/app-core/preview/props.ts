// Reads the camera's PTP device properties (the PtpCodec.parseAllProps output) as preview readings. Pure: no native or React imports.
// A value outside the tables is kept as raw and never guessed. 0xD22C (focus area) and 0xD178 (soft skin) have no verified values, so they are not read.
import { APERTURES, ISOS, SHUTTERS, shutterDisplay } from "../../zve10/dat.ts";
import { KELVIN_RANGE } from "../sets/options.ts";

export interface PtpProp {
  code: number;
  dataType: number;
  getSet: number;
  isEnabled: number;
  /** Numeric values are decoded. Any other value (string, null) reads as missing. */
  current: number | string | null;
}

export const PROP = {
  exposureProgram: 0x500e,
  fNumber: 0x5007,
  shutter: 0xd20d,
  iso: 0xd21e,
  whiteBalance: 0x5005,
  kelvin: 0xd20f,
  focus: 0x500a,
  metering: 0x500b,
  pictureProfile: 0xd23f,
} as const;

export type Reading<T> = { kind: "value"; value: T } | { kind: "raw"; raw: number } | { kind: "missing" };

export type ExposureProgram = "M" | "P" | "A" | "S";
export type WbMode = "awb" | "daylight" | "incandescent" | "cloudy" | "shade" | "ctemp";
export type Focus = "MF" | "AF-S" | "AF-C";
export type Metering = "multi";

export interface PreviewReadings {
  mode: Reading<ExposureProgram>;
  /** "4.5" */
  aperture: Reading<string>;
  /** "1/30" or '30"' */
  shutter: Reading<string>;
  /** "AUTO" or "400" */
  iso: Reading<string>;
  wb: Reading<WbMode>;
  kelvin: Reading<number>;
  focus: Reading<Focus>;
  metering: Reading<Metering>;
  /** 0 = off, 1 to 10 = PP1 to PP10 */
  pp: Reading<number>;
}

const EXPOSURE_PROGRAM = new Map<number, ExposureProgram>([
  [1, "M"],
  [2, "P"],
  [3, "A"],
  [4, "S"],
]);
const WB_MODE = new Map<number, WbMode>([
  [0x0002, "awb"],
  [0x0004, "daylight"],
  [0x0006, "incandescent"],
  [0x8010, "cloudy"],
  [0x8011, "shade"],
  [0x8012, "ctemp"],
]);
const FOCUS = new Map<number, Focus>([
  [1, "MF"],
  [2, "AF-S"],
  [0x8004, "AF-C"],
]);
const METERING = new Map<number, Metering>([[0x8001, "multi"]]);
const ISO_AUTO = 0x00ffffff;

function read<T>(prop: PtpProp | undefined, decode: (n: number) => T | undefined): Reading<T> {
  if (!prop || typeof prop.current !== "number") return { kind: "missing" };
  const value = decode(prop.current);
  return value === undefined ? { kind: "raw", raw: prop.current } : { kind: "value", value };
}

const aperture = (n: number) => APERTURES.find((a) => Math.round(Number(a) * 100) === n);

// u32: numerator in the high 16 bits, denominator in the low 16 bits.
const shutter = (n: number) => {
  const num = n >>> 16;
  const den = n & 0xffff;
  return SHUTTERS.find((s) => {
    const [a, b] = shutterDisplay(s);
    return a === num && b === den;
  });
};

const iso = (n: number) => {
  const label = n === ISO_AUTO ? "AUTO" : String(n);
  return ISOS.includes(label) ? label : undefined;
};

const kelvin = (n: number) =>
  n >= KELVIN_RANGE.min && n <= KELVIN_RANGE.max && (n - KELVIN_RANGE.min) % KELVIN_RANGE.step === 0 ? n : undefined;

const pictureProfile = (n: number) => (n <= 10 ? n : undefined);

export function readPreview(props: readonly PtpProp[]): PreviewReadings {
  const byCode = new Map(props.map((p) => [p.code, p] as const));
  const at = (code: number) => byCode.get(code);
  return {
    mode: read(at(PROP.exposureProgram), (n) => EXPOSURE_PROGRAM.get(n)),
    aperture: read(at(PROP.fNumber), aperture),
    shutter: read(at(PROP.shutter), shutter),
    iso: read(at(PROP.iso), iso),
    wb: read(at(PROP.whiteBalance), (n) => WB_MODE.get(n)),
    kelvin: read(at(PROP.kelvin), kelvin),
    focus: read(at(PROP.focus), (n) => FOCUS.get(n)),
    metering: read(at(PROP.metering), (n) => METERING.get(n)),
    pp: read(at(PROP.pictureProfile), pictureProfile),
  };
}

/** Display text for each reading. Word labels come from the caller (content.ts), so this module stays free of UI strings. */
export interface PreviewLabels {
  wb: Record<Exclude<WbMode, "ctemp">, string>;
  focus: Record<Focus, string>;
  metering: Record<Metering, string>;
  ppOff: string;
}

export type CellKey = "mode" | "aperture" | "shutter" | "iso" | "wb" | "focus" | "metering" | "pp";
export type Cells = Record<CellKey, string>;

const MISSING = "—";
const hex = (raw: number) => `0x${raw.toString(16).toUpperCase()}`;

function text<T>(reading: Reading<T>, show: (value: T) => string): string {
  if (reading.kind === "missing") return MISSING;
  if (reading.kind === "raw") return hex(reading.raw);
  return show(reading.value);
}

export function formatCells(r: PreviewReadings, labels: PreviewLabels): Cells {
  return {
    mode: text(r.mode, (v) => v),
    aperture: text(r.aperture, (v) => `F${v}`),
    shutter: text(r.shutter, (v) => v),
    iso: text(r.iso, (v) => `ISO ${v}`),
    wb: text(r.wb, (v) => (v === "ctemp" ? text(r.kelvin, (k) => `${k}K`) : labels.wb[v])),
    focus: text(r.focus, (v) => labels.focus[v]),
    metering: text(r.metering, (v) => labels.metering[v]),
    pp: text(r.pp, (v) => (v === 0 ? labels.ppOff : `PP${v}`)),
  };
}
