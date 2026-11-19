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
