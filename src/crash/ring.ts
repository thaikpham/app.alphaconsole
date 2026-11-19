// The last ACL timing lines, kept in memory so a JS crash entry can carry them.
// Pure apart from the module-level buffer: no expo or RN imports, so node:test can run it.
// The native ring (AclRing.kt) has the same capacity. Keep them in step.

export const ACL_RING_CAPACITY = 50;

/** A new array with [line] at the end. The oldest lines go so that at most [capacity] remain. The input is not changed. */
export function ringPush(ring: readonly string[], line: string, capacity = ACL_RING_CAPACITY): string[] {
  const next = [...ring, line];
  return next.length > capacity ? next.slice(next.length - capacity) : next;
}

let lines: readonly string[] = [];

/** Keeps one ACL line. The caller adds the "ACL " prefix, as the logcat line has it. */
export function recordAcl(line: string): void {
  lines = ringPush(lines, line);
}

/** The kept ACL lines, oldest first. Do not mutate. */
export function recentAcl(): readonly string[] {
  return lines;
}
