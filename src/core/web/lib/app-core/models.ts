// The camera registry: every model the app knows, what it can read and write, and how to find it from a search or from the card.
// Pure TS: no native, storage or React imports. The card reader, the write flow and the camera selection all use it.

export type ModelId = "zve10" | "a6400" | "a7c2" | "a6700" | "a7c" | "a7iv" | "zve1";

export type CameraModel = {
  id: ModelId;
  /** Name on the body, shown to the user. */
  name: string;
  /** Model string in the settings file header (bytes 5 up to the first NUL) and, where known, in MEDIAPRO.XML. */
  sonyModel: string;
  /** Other names a user may type. Spaces, hyphens and the "ILCE" prefix are ignored when matching. */
  aliases: readonly string[];
  /** USB product name and ids, when known. Mass Storage and PC Remote have their own ids. */
  usb: { productName: string; productIds: readonly number[] } | null;
  /** Folder under PRIVATE/SONY/SETTING. Null when not known: the reader then looks for the header model. */
  settingFolder: string | null;
  capabilities: {
    read: boolean;
    write: boolean;
    /** Why the model cannot be read or written yet. Null when it can. */
    reason: string | null;
  };
};

export const ZV_E10: CameraModel = {
  id: "zve10",
  name: "ZV-E10",
  sonyModel: "ZV-E10",
  aliases: [],
  usb: { productName: "ZV-E10", productIds: [0x0d95, 0x0d97] },
  settingFolder: "E10",
  capabilities: { read: true, write: true, reason: null },
};

export const A6400: CameraModel = {
  id: "a6400",
  name: "A6400",
  sonyModel: "ILCE-6400",
  aliases: [],
  usb: null,
  settingFolder: null,
  capabilities: { read: true, write: false, reason: "Chỉ đọc thử nghiệm; thư mục cài đặt chưa xác định" },
};

export const A7C2: CameraModel = {
  id: "a7c2",
  name: "A7C II",
  sonyModel: "ILCE-7CM2",
  aliases: ["a7c2"],
  usb: null,
  settingFolder: "7CM2",
  capabilities: { read: true, write: false, reason: "chưa thử trên máy" },
};

const A6700: CameraModel = {
  id: "a6700",
  name: "A6700",
  sonyModel: "ILCE-6700",
  aliases: [],
  usb: null,
  settingFolder: null,
  capabilities: { read: false, write: false, reason: "Sắp có" },
};

const A7C: CameraModel = {
  id: "a7c",
  name: "A7C",
  sonyModel: "ILCE-7C",
  aliases: [],
  usb: null,
  settingFolder: null,
  capabilities: { read: false, write: false, reason: "Sắp có" },
};

const A7IV: CameraModel = {
  id: "a7iv",
  name: "A7 IV",
  sonyModel: "ILCE-7M4",
  aliases: ["a74", "a7m4"],
  usb: null,
  settingFolder: null,
  capabilities: { read: false, write: false, reason: "Sắp có" },
};

const ZV_E1: CameraModel = {
  id: "zve1",
  name: "ZV-E1",
  sonyModel: "ZV-E1",
  aliases: [],
  usb: null,
  settingFolder: null,
  capabilities: { read: false, write: false, reason: "Sắp có" },
};

export const CAMERAS: readonly CameraModel[] = [ZV_E10, A6400, A7C2, A6700, A7C, A7IV, ZV_E1];

export const DEFAULT_MODEL: CameraModel = ZV_E10;

/**
 * Internal flag. The A7C II set builder (planA7c2) refuses to run while this is false. It stays false until the
 * builder's output has been checked on a real camera. Tests turn it on for their own run and turn it back off.
 */
export const EXPERIMENTAL_WRITE: { a7c2: boolean } = { a7c2: false };

/** Lower case, without spaces, hyphens or the "ILCE" prefix. "ZV E10", "zv-e10" and "ZVE10" all become "zve10". */
export function normalizeModelQuery(input: string): string {
  return input.toLowerCase().replace(/[\s-]+/g, "").replace(/^ilce/, "");
}

function searchKeys(model: CameraModel): string[] {
  return [...new Set([model.name, model.sonyModel, ...model.aliases].map(normalizeModelQuery))];
}

/** The models whose name, Sony model or alias equals the query after normalizing. Empty for an empty query. */
export function findModels(query: string): CameraModel[] {
  const q = normalizeModelQuery(query);
  if (q === "") return [];
  return CAMERAS.filter((model) => searchKeys(model).includes(q));
}

export function modelById(id: string): CameraModel | null {
  return CAMERAS.find((model) => model.id === id) ?? null;
}

/** The model named by MEDIAPRO.XML's system kind, when exactly one model matches. */
export function modelFromSystemKind(systemKind: string | null): CameraModel | null {
  if (systemKind === null) return null;
  const found = findModels(systemKind);
  return found.length === 1 ? found[0] : null;
}

export function modelFromUsbProductId(productId: number): CameraModel | null {
  return CAMERAS.find((model) => model.usb?.productIds.includes(productId)) ?? null;
}

/**
 * The camera for the attached card. The card's own system kind wins, then the USB product id, then the camera the
 * user chose before, then ZV-E10 (the only model the app has always read and written).
 */
export function chooseModel(input: {
  systemKind: string | null;
  productId: number | null;
  selected: ModelId | null;
}): CameraModel {
  const fromCard = modelFromSystemKind(input.systemKind);
  if (fromCard) return fromCard;
  const fromUsb = input.productId === null ? null : modelFromUsbProductId(input.productId);
  if (fromUsb) return fromUsb;
  const chosen = input.selected === null ? null : modelById(input.selected);
  return chosen ?? DEFAULT_MODEL;
}

/** The model id saved in camera.json ({"model": id}). Null when the text is missing, not JSON, or names no model. */
export function parseCameraSelection(text: string | null): ModelId | null {
  if (text === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const name = typeof parsed === "object" && parsed !== null && "model" in parsed ? parsed.model : undefined;
  return typeof name === "string" ? (modelById(name)?.id ?? null) : null;
}
