// The app's copy of the user sets file (Documents/user-sets.json) and the store built on it.
import { File, Paths } from "expo-file-system";
import { createSetStore, type SetsAdapter } from "@/core/web/lib/app-core/sets/store";
import { explicitPp } from "@/core/web/lib/app-core/transfer/plan";
import { validatePresetSets } from "@/core/web/lib/presetSets";
import presetJson from "@/core/web/data/preset-sets.json";

const file = new File(Paths.document, "user-sets.json");

export const userSetsAdapter: SetsAdapter = {
  async read() {
    return file.exists ? file.text() : null;
  },
  async write(text) {
    if (!file.exists) file.create();
    await file.write(text);
  },
};

// Bundled hybrid sets are PP-on by name; explicitPp makes that ppOn: true so a written slot says so.
export const setStore = createSetStore(userSetsAdapter, validatePresetSets(presetJson).map(explicitPp));
