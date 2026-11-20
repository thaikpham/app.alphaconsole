// The app's copy of the user sets file, kept in localStorage as user-sets.json on the web. Same text as the native file.
import { createSetStore, type SetsAdapter } from "@/core/web/lib/app-core/sets/store";
import { explicitPp } from "@/core/web/lib/app-core/transfer/plan";
import { validatePresetSets } from "@/core/web/lib/presetSets";
import presetJson from "@/core/web/data/preset-sets.json";

const KEY = "user-sets.json";

export const userSetsAdapter: SetsAdapter = {
  async read() {
    return localStorage.getItem(KEY);
  },
  async write(text) {
    localStorage.setItem(KEY, text);
  },
};

// Bundled hybrid sets are PP-on by name; explicitPp makes that ppOn: true so a written slot says so.
export const setStore = createSetStore(userSetsAdapter, validatePresetSets(presetJson).map(explicitPp));
