// Undo stack for the slot editor. The editor pushes a snapshot of the four slots before each change.

export const HISTORY_LIMIT = 30;

/** Adds a snapshot as the newest entry. Keeps the last HISTORY_LIMIT entries. */
export function pushHistory<T>(stack: readonly T[], snapshot: T): T[] {
  const next = [...stack, snapshot];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

/** Takes the newest snapshot off the stack. Returns null when the stack is empty. */
export function popHistory<T>(stack: readonly T[]): { stack: T[]; snapshot: T } | null {
  if (stack.length === 0) return null;
  return { stack: stack.slice(0, -1), snapshot: stack[stack.length - 1] };
}
