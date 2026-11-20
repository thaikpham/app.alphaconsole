// The camera the user chose, kept in localStorage as camera.json ({"model": id}) on the web. Same text as the native file.
import { parseCameraSelection, type ModelId } from "@/core/web/lib/app-core/models";

const KEY = "camera.json";

/** Null when nothing is saved, or the saved text names no model. */
export async function loadCameraSelection(): Promise<ModelId | null> {
  return parseCameraSelection(localStorage.getItem(KEY));
}

export async function saveCameraSelection(id: ModelId): Promise<void> {
  localStorage.setItem(KEY, JSON.stringify({ model: id }));
}
