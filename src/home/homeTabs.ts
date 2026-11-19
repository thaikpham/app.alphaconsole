// Tabs of the preset home. Pure: the tab named by the route and the sets each tab shows.
export type HomeTab = "recommended" | "mine";

/** The tab named by the route's `tab` param. Anything other than "mine" opens the recommended tab. */
export function parseHomeTab(value: string | string[] | undefined): HomeTab {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "mine" ? "mine" : "recommended";
}

/** Recommended shows the bundled sets that are listed (not unlisted). Mine shows the user's sets. */
export function tabSets<T extends { unlisted?: boolean }>(tab: HomeTab, bundled: readonly T[], mine: readonly T[]): T[] {
  return tab === "mine" ? [...mine] : bundled.filter((set) => set.unlisted !== true);
}
