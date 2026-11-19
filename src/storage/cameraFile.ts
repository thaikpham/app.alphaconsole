// The camera the user chose (Documents/camera.json, {"model": id}). Read at each card read as the first guess.
import { File, Paths } from "expo-file-system";
import { parseCameraSelection, type ModelId } from "@/core/models";

const file = new File(Paths.document, "camera.json");

/** Null when nothing is saved, or the saved text names no model. */
export async function loadCameraSelection(): Promise<ModelId | null> {
  return parseCameraSelection(file.exists ? await file.text() : null);
}

export async function saveCameraSelection(id: ModelId): Promise<void> {
  if (!file.exists) file.create();
  await file.write(JSON.stringify({ model: id }));
}
