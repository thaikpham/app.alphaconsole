// Reads the card for the screens: what it is, what the app last wrote to it, and an unconfirmed write to finish or undo.
// The decisions are in src/core. This file ties them to the native module and the write state file.
import { describeCard, toCardState, type CardView } from "@/core/card/view";
import { describeReadOnly, type ReadOnlySlot } from "@/core/card/readOnly";
import { chooseModel, modelFromSystemKind, type CameraModel, type ModelId } from "@/core/models";
import { matchingSet } from "@/core/sets/match";
import { existingFamily, explicitPp, planWriteFor, TransferError, type CardState, type Family, type PlannedFile } from "@/core/transfer/plan";
import { chooseFamily, overwrittenSlots, recordFor, recordHolds, StateError, type PendingWrite, type WriteRecord } from "@/core/transfer/state";
import { listedSets, type PresetSet } from "@/core/web/lib/presetSets";
import { loadCameraSelection } from "@/storage/cameraFile";
import { setStore } from "@/storage/userSetsFile";
import { dropLastWritten, dropPending, loadWriteState, updateWriteState } from "@/storage/writeState";
import { getUsbState, inspectCard, pickCardTree, restoreBackup, type CardInspection } from "../../modules/usb-volume";
import { createCardReader } from "./reader";
import { createMountWait } from "./mountWait";
import { aclLap, aclLog } from "./timing";

export type Recovery = { kind: "completed" } | { kind: "restored" } | { kind: "noBackup" } | { kind: "restoreFailed" };

export type ReadyCard = {
  uuid: string;
  /** The camera the card was read as. Only models the app can write reach this type. */
  model: CameraModel;
  systemKind: string | null;
  state: CardState;
  view: CardView;
  /** Listed set the card matches. Null when the card has no CAMPR files, a family error, or no known set. */
  matched: PresetSet | null;
  /** Family the app remembers for this card. */
  remembered: Family | undefined;
  lastWritten: WriteRecord | null;
  /** Slots (1–4) the camera changed since the app's last write. */
  overwritten: number[];
  /** Set when an unconfirmed write was checked on this read. */
  recovery: Recovery | null;
};

/**
 * readOnly: a model the app reads but does not write (A6400, A7C II). folder is false when the card has no settings folder for it.
 * unsupported: a model the app does not read yet.
 */
export type CardReading =
  | { kind: "absent" }
  | { kind: "noSony" }
  | { kind: "ready"; card: ReadyCard }
  | { kind: "readOnly"; uuid: string; model: CameraModel; folder: boolean; slots: ReadOnlySlot[] }
  | { kind: "unsupported"; uuid: string; model: CameraModel };

const activeWrites = new Set<string>();

/** Marks a card busy with a write or restore, so a read in the meantime does not finish or undo that work. */
export function beginWrite(uuid: string): void {
  activeWrites.add(uuid);
}

export function endWrite(uuid: string): void {
  activeWrites.delete(uuid);
}

/** The app's own errors (state file, transfer rules) say what to do. Anything else gets the fallback. */
export function userMessage(e: unknown, fallback: string): string {
  return e instanceof StateError || e instanceof TransferError ? e.message : fallback;
}

function errorCode(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String(e.code) : undefined;
}

async function allSets(): Promise<PresetSet[]> {
  const { bundled, user } = await setStore.load();
  return [...bundled, ...user];
}

/**
 * Null when the saved folder's volume is not mounted, or the folder is no longer accessible. One native call: the
 * native side finds the card and reads it, so the card is probed once per read. The folder is the model's own;
 * when the model has none, the native side scans for its header.
 */
async function inspectIfMounted(model: CameraModel): Promise<CardInspection | null> {
  const t0 = Date.now();
  try {
    const inspection = await inspectCard(model.settingFolder, model.sonyModel);
    aclLap(`inspectCard files=${inspection.files.length}`, t0);
    return inspection;
  } catch (e) {
    aclLap(`inspectCard ${errorCode(e) ?? "error"}`, t0);
    if (errorCode(e) === "E_NO_TREE") return null;
    throw e;
  }
}

/** USB product id of the attached Sony device, or null when it cannot be read. Asked only when the card names no model. */
async function attachedProductId(): Promise<number | null> {
  try {
    return (await getUsbState())?.productId ?? null;
  } catch {
    return null;
  }
}

/** The camera for the card: its system kind, else the attached USB product id, else the stored choice, else ZV-E10. */
async function detectModel(systemKind: string | null, selected: ModelId | null): Promise<CameraModel> {
  const productId = modelFromSystemKind(systemKind) === null ? await attachedProductId() : null;
  return chooseModel({ systemKind, productId, selected });
}

function familyOrNull(state: CardState): Family | null {
  try {
    return existingFamily(state);
  } catch (e) {
    if (e instanceof TransferError) return null;
    throw e;
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** True when every planned file is on the card, byte for byte. */
function onCard(planned: PlannedFile[], state: CardState): boolean {
  return planned.every((p) => {
    const name = p.relPath.split("/").pop();
    const file = state.settingFiles.find((f) => f.name === name);
    return file !== undefined && sameBytes(file.bytes, p.bytes);
  });
}

/** After a restore the card holds the backup's files. The last-write record stays only if they still match it. */
export async function forgetStaleRecord(uuid: string, state: CardState): Promise<void> {
  const record = (await loadWriteState()).lastWritten[uuid];
  if (record && !recordHolds(state, record)) await updateWriteState((s) => dropLastWritten(s, uuid));
}

/**
 * Finish or undo a write that was not confirmed. Planning from the card as it is now gives the written files,
 * because a written file keeps the header it was planned from. If every planned file is there, the write is complete.
 * Otherwise the backup is restored. Without a backup the set has to be written again.
 */
async function recover(
  model: CameraModel,
  uuid: string,
  pending: PendingWrite,
  state: CardState,
  remembered: Family | undefined,
  sets: PresetSet[],
): Promise<Recovery> {
  const set = sets.find((s) => s.id === pending.setId);
  if (set) {
    try {
      const family = chooseFamily(familyOrNull(state), remembered).family;
      const planned = planWriteFor(model, state, explicitPp(set), family);
      if (onCard(planned, state)) {
        const record = recordFor(set.id, planned, family, pending.startedAt);
        await updateWriteState((s) => ({
          ...dropPending(s, uuid),
          families: { ...s.families, [uuid]: family },
          lastWritten: { ...s.lastWritten, [uuid]: record },
        }));
        return { kind: "completed" };
      }
    } catch {
      // Not provably complete: the backup is restored below.
    }
  }
  try {
    const report = await restoreBackup(pending.backupId);
    if (!report.ok) return { kind: "restoreFailed" };
    await updateWriteState((s) => dropPending(s, uuid));
    return { kind: "restored" };
  } catch (e) {
    if (errorCode(e) === "E_NO_BACKUP") {
      await updateWriteState((s) => dropPending(s, uuid));
      return { kind: "noBackup" };
    }
    return { kind: "restoreFailed" };
  }
}

export async function readCard(): Promise<CardReading> {
  const t0 = Date.now();
  try {
    return await readCardSteps();
  } finally {
    aclLap("readCard", t0);
  }
}

async function readCardSteps(): Promise<CardReading> {
  aclLog("before loadCameraSelection");
  const selected = await loadCameraSelection();
  const guess = chooseModel({ systemKind: null, productId: null, selected });
  aclLog("before inspectIfMounted");
  let inspection = await inspectIfMounted(guess);
  if (!inspection) return { kind: "absent" };
  if (!inspection.sonyCard) return { kind: "noSony" };

  // The card decides the model. Inspect again only when that model reads another folder than the guess did.
  const model = await detectModel(inspection.systemKind, selected);
  if (model.capabilities.read && (model.settingFolder !== guess.settingFolder || model.sonyModel !== guess.sonyModel)) {
    inspection = await inspectIfMounted(model);
    if (!inspection) return { kind: "absent" };
    if (!inspection.sonyCard) return { kind: "noSony" };
  }

  const uuid = inspection.uuid;
  if (!model.capabilities.read) return { kind: "unsupported", uuid, model };
  if (!model.capabilities.write) {
    const { settingFiles } = toCardState(inspection);
    return { kind: "readOnly", uuid, model, folder: inspection.settingDir, slots: describeReadOnly(model, settingFiles) };
  }

  const tSets = Date.now();
  aclLog("before allSets");
  const sets = await allSets();
  aclLap("allSets", tSets);
  let recovery: Recovery | null = null;
  if (!activeWrites.has(uuid)) {
    aclLog("before loadWriteState (pending check)");
    const ws = await loadWriteState();
    const pending = ws.pending[uuid];
    if (pending) {
      aclLog("before recover");
      recovery = await recover(model, uuid, pending, toCardState(inspection), ws.families[uuid], sets);
      if (recovery.kind === "restored") {
        aclLog("before inspectIfMounted (after restore)");
        const again = await inspectIfMounted(model);
        if (!again) return { kind: "absent" };
        inspection = again;
      }
    }
  }

  aclLog("before toCardState");
  const state = toCardState(inspection);
  if (recovery?.kind === "restored") {
    aclLog("before forgetStaleRecord");
    await forgetStaleRecord(uuid, state);
  }
  aclLog("before loadWriteState (view)");
  const ws = await loadWriteState();
  aclLog("before listedSets");
  const listed = listedSets(sets);
  aclLog("before describeCard");
  const tView = Date.now();
  const view = describeCard(state, listed);
  aclLap("describeCard", tView);
  const ok = view.error === null;
  const lastWritten = ws.lastWritten[uuid] ?? null;
  aclLog("before matchingSet");
  const tMatch = Date.now();
  const matched = ok && view.family ? matchingSet(state, listed, view.family) : null;
  aclLap("matchingSet", tMatch);
  aclLog("before overwrittenSlots");
  return {
    kind: "ready",
    card: {
      uuid,
      model,
      systemKind: inspection.systemKind,
      state,
      view,
      matched,
      remembered: ws.families[uuid],
      lastWritten,
      overwritten: ok && lastWritten ? overwrittenSlots(state, lastWritten) : [],
      recovery,
    },
  };
}

/**
 * The reader the screens share: one read at a time, triggers that arrive during a read join it, and the last reading
 * stays on screen while a read runs. See reader.ts.
 */
export const cardReader = createCardReader<CardReading>({
  read: readCard,
  detached: { kind: "absent" },
  log: aclLog,
});

/**
 * The wait for a card after a mass-storage attach, when the volume may not be mounted yet. Reads through cardReader.
 * See mountWait.ts.
 */
export const mountWait = createMountWait({
  read: (trigger) => cardReader.request(trigger),
  found: () => {
    const reading = cardReader.getState().reading;
    return reading !== null && reading.kind !== "absent";
  },
  log: aclLog,
});

export type GrantOutcome = "granted" | "declined" | "unavailable";

/** Opens the folder picker at the card's volume. Used only when all-files access is refused. */
export async function grantCardFolder(): Promise<GrantOutcome> {
  try {
    await pickCardTree();
    return "granted";
  } catch (e) {
    return errorCode(e) === "E_PICK_CANCELLED" ? "declined" : "unavailable";
  }
}
