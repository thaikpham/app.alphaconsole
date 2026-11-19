// New set from a copy of a base set (SPEC 9.2). Pure: no React or native imports.
import type { PresetSet, PresetSlot } from "../core/web/lib/presetSets.ts";

/** Longest name of a new set (SPEC 9.2). */
export const NEW_NAME_LIMIT = 32;
/** Longest name of one slot in a new set (SPEC 9.2). */
export const NEW_LABEL_LIMIT = 20;

/** Trims, then keeps the first `max` code points. Code points, not UTF-16 units, so an astral character is never split. */
export function clipText(text: string, max: number): string {
  return Array.from(text.trim()).slice(0, max).join("").trim();
}

/** The typed slot label, or the base label when the typed one is empty after trimming. */
export function slotLabel(typed: string, base: string): string {
  return clipText(typed, NEW_LABEL_LIMIT) || base;
}

/**
 * The copy with the user's name and the four typed slot labels (`labels` in slot order).
 * An empty name keeps the copy's name. Notes and settings of each slot are kept.
 */
export function applyNewSet(copy: PresetSet, name: string, labels: readonly string[]): PresetSet {
  const slot = (i: number): PresetSlot => ({
    ...copy.slots[i],
    label: slotLabel(labels[i] ?? "", copy.slots[i].label),
  });
  return {
    ...copy,
    name: clipText(name, NEW_NAME_LIMIT) || copy.name,
    slots: [slot(0), slot(1), slot(2), slot(3)],
  };
}
