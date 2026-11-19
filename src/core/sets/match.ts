// Which set a card already holds: a set matches when writing it would change none of the four slot files.
import { compare, type CardState, type Family } from "../transfer/plan.ts";
import type { PresetSet } from "../web/lib/presetSets.ts";

/** First set in sets that the card already holds, or null. A set that cannot be planned (invalid, or PP rule broken) cannot match. */
export function matchingSet(card: CardState, sets: readonly PresetSet[], family: Family): PresetSet | null {
  for (const set of sets) {
    try {
      if (compare(card, set, family).length === 0) return set;
    } catch {
      continue;
    }
  }
  return null;
}
