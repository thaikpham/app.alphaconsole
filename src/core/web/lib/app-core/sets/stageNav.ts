// Stage order in the slot editor. Tiếp walks the stages of one slot, then stage 0 of the next slot.
// Positions are 0-based: slot 0–3 is M1–M4, stage 0–3 is the stage list in content.ts (stages).

export type StagePosition = { slot: number; stage: number };

/** Position after Tiếp. At the last stage of the last slot the position is unchanged. */
export function nextPosition(pos: StagePosition, lastSlot: number, lastStage: number): StagePosition {
  if (pos.stage < lastStage) return { slot: pos.slot, stage: pos.stage + 1 };
  if (pos.slot < lastSlot) return { slot: pos.slot + 1, stage: 0 };
  return pos;
}

/** Position after Bước trước: the previous stage of the same slot. At stage 0 the position is unchanged. */
export function prevPosition(pos: StagePosition): StagePosition {
  if (pos.stage > 0) return { slot: pos.slot, stage: pos.stage - 1 };
  return pos;
}

/** Position after tapping a stage of the same slot. An index outside 0..lastStage leaves the position unchanged. */
export function positionOfStage(pos: StagePosition, stage: number, lastStage: number): StagePosition {
  if (!Number.isInteger(stage) || stage < 0 || stage > lastStage) return pos;
  return { slot: pos.slot, stage };
}
