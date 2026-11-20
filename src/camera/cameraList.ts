// Camera list for the device pick and the camera sheet. Pure: no React or native imports.
import type { CameraModel } from "../core/web/lib/app-core/models.ts";

/** SPEC 5.7 norm: lower case, with spaces, "-", "_" and "." removed. "ZV-E10", "zv e10" and "ZV.E10" all become "zve10". */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().replace(/[\s\-_.]+/g, "");
}

/** True when the query is part of the model's name, Sony model or an alias. An empty query matches every model. */
export function matchesSearch(model: CameraModel, query: string): boolean {
  const q = normalizeSearch(query);
  if (q === "") return true;
  return [model.name, model.sonyModel, ...model.aliases].some((text) => normalizeSearch(text).includes(q));
}

export type CameraGroups = { supported: CameraModel[]; soon: CameraModel[] };

/** Writable models form "supported"; the rest form "soon". Models that do not match the query are left out. */
export function groupCameras(models: readonly CameraModel[], query: string): CameraGroups {
  const shown = models.filter((model) => matchesSearch(model, query));
  return {
    supported: shown.filter((model) => model.capabilities.write),
    soon: shown.filter((model) => !model.capabilities.write),
  };
}
