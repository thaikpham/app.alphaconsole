// Tabs of the preset home. Pure: the tab named by the route and the sets each tab shows.
export type HomeTab = "recommended" | "kol" | "mine";

/** The tab named by the route's `tab` param. Anything other than "kol" or "mine" opens the recommended tab. */
export function parseHomeTab(value: string | string[] | undefined): HomeTab {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "mine" || first === "kol") return first;
  return "recommended";
}

/**
 * Recommended: listed bundled sets with no author, or the one marked recommended.
 * KOL: listed bundled sets with an author that are not the recommended one (the author is the KOL who made the set).
 * Mine: the user's sets.
 */
export function tabSets<T extends { unlisted?: boolean; author?: unknown; recommended?: boolean }>(
  tab: HomeTab,
  bundled: readonly T[],
  mine: readonly T[],
): T[] {
  if (tab === "mine") return [...mine];
  const listed = bundled.filter((set) => set.unlisted !== true);
  if (tab === "kol") return listed.filter((set) => set.author !== undefined && set.recommended !== true);
  return listed.filter((set) => set.author === undefined || set.recommended === true);
}
