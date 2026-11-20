// Scene photo for a preset slot, by the slot's Vietnamese label (SPEC 5.2). Pure: no React or native imports.

/** Bundled scene photo name. Matches SceneThumb's SceneName. */
export type SceneImage = "night" | "portrait" | "street" | "sunset";

/** Image key per scene: S = street, P = portrait, H = sunset, N = night. */
const IMAGE_BY_SCENE = new Map<string, SceneImage>([
  ["Đời thường", "street"],
  ["Nắng gắt", "street"],
  ["Phố", "street"],
  ["Mưa", "street"],
  ["Chân dung", "portrait"],
  ["Bóng râm", "portrait"],
  ["Trong nhà", "portrait"],
  ["Cà phê", "portrait"],
  ["Cận mặt", "portrait"],
  ["Studio", "portrait"],
  ["Livestream", "portrait"],
  ["Hoàng hôn", "sunset"],
  ["Ngoại cảnh", "sunset"],
  ["Đêm", "night"],
  ["Đèn đường", "night"],
  ["Chợ đêm", "night"],
]);

/** SPEC 5.2 aliases: Lễ đường is Chân dung, Tiệc is Đời thường. */
const SCENE_ALIAS = new Map<string, string>([
  ["Lễ đường", "Chân dung"],
  ["Tiệc", "Đời thường"],
]);

/** Labels not in the table (for example "Chụp với flash") use the portrait photo. */
const FALLBACK: SceneImage = "portrait";

export function sceneFor(label: string): SceneImage {
  const name = SCENE_ALIAS.get(label) ?? label;
  return IMAGE_BY_SCENE.get(name) ?? FALLBACK;
}

/** How the design draws one slot photo: which photo, a CSS filter for the look, and a zoom (AlphaApp SCENE0). */
export type SceneLook = { image: SceneImage; filter: string; scale: number };

const IMAGE_KEY: Record<string, SceneImage> = { S: "street", P: "portrait", H: "sunset", N: "night" };

/** AlphaApp SCENE0, verbatim: [photo, filter, zoom]. */
const SCENE0: Record<string, [string, string, number]> = {
  "Đời thường": ["S", "saturate(1.08) contrast(1.02)", 1],
  "Chân dung": ["P", "sepia(.16) saturate(1.12) brightness(1.08) contrast(.92)", 1.15],
  "Hoàng hôn": ["H", "saturate(1.3) contrast(1.06) sepia(.12)", 1],
  "Đêm": ["N", "saturate(1.15) contrast(1.1)", 1],
  "Nắng gắt": ["S", "contrast(1.25) saturate(1.45) brightness(1.1)", 1],
  "Bóng râm": ["P", "sepia(.3) saturate(1.25) brightness(1.12)", 1],
  "Trong nhà": ["P", "sepia(.55) saturate(1.5) hue-rotate(-10deg) brightness(1.02)", 1],
  "Đèn đường": ["N", "sepia(.8) saturate(2.3) brightness(1.1) contrast(1.05)", 1],
  "Phố": ["S", "contrast(1.14) saturate(.66) sepia(.26)", 1],
  "Cà phê": ["P", "sepia(.72) saturate(1.15) brightness(.9) contrast(1.16)", 1.3],
  "Chợ đêm": ["N", "saturate(1.5) contrast(1.18) brightness(1.05)", 1],
  "Mưa": ["S", "grayscale(.62) contrast(.88) brightness(.94)", 1],
  "Cận mặt": ["P", "sepia(.24) saturate(1.15) brightness(1.12) contrast(.88)", 1.9],
  "Ngoại cảnh": ["H", "saturate(1.4) contrast(1.12) brightness(1.06)", 1],
  "Studio": ["P", "contrast(1.22) saturate(.78) brightness(1.06)", 1.45],
  "Livestream": ["P", "brightness(1.2) saturate(1.35) contrast(.9)", 1],
};

/** Look for a slot label; unknown labels get the plain portrait photo, as in the design. */
export function sceneLook(label: string): SceneLook {
  const entry = SCENE0[label] ?? SCENE0[SCENE_ALIAS.get(label) ?? ""];
  if (!entry) return { image: "portrait", filter: "none", scale: 1 };
  return { image: IMAGE_KEY[entry[0]] ?? FALLBACK, filter: entry[1], scale: entry[2] };
}
