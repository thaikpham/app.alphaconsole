// The preset home list (SPEC §2.4.2). Only the recommended sets are shown; there are no KOL or "Của tôi" tabs.

/**
 * Recommended: listed bundled sets with no author, or the one marked recommended.
 * Unlisted sets are never shown.
 */
export function recommendedSets<T extends { unlisted?: boolean; author?: unknown; recommended?: boolean }>(bundled: readonly T[]): T[] {
  return bundled.filter((set) => set.unlisted !== true && (set.author === undefined || set.recommended === true));
}
