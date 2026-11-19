// Write flow stages (SPEC screens 3 to 5): the stage a write phase is in, the stepper position, and the ring count. Pure: no native or React imports.

/** The write phase, as write.tsx tracks it. */
export type WritePhase = "idle" | "writing" | "ok" | "rolledBack" | "kept";

/** "connect" is the camera check before a write. "recall" is the reload on the camera after a confirmed write. */
export type WriteStage = "connect" | "writing" | "done" | "failed" | "recall";

export const RING_TOTAL = 4;

/** The stage a phase shows. "recall" only follows a confirmed write. */
export function stageOf(phase: WritePhase, recall: boolean): WriteStage {
  if (phase === "writing") return "writing";
  if (phase === "ok") return recall ? "recall" : "done";
  if (phase === "rolledBack" || phase === "kept") return "failed";
  return "connect";
}

/** Stepper position in the home steps: "Ghi" is 3, "Nạp" (reload on the camera) is 4. */
export function stepIndex(stage: WriteStage): number {
  return stage === "recall" ? 4 : 3;
}

/**
 * Ring segments to fill. Only a confirmed write fills all four. While writing the ring stops at three, so it never
 * reads as done before the card confirms it. A failed write shows none: the card holds the old set or an unknown mix.
 */
export function ringCount(phase: WritePhase, okFiles: number): number {
  if (phase === "ok") return RING_TOTAL;
  if (phase === "writing") return Math.min(Math.max(okFiles, 0), RING_TOTAL - 1);
  return 0;
}
