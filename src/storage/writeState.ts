// The app's write state file (Documents/write-state.json): family per card, last write, and a write not yet confirmed.
import { File, Paths } from "expo-file-system";
import { parseWriteState, serializeWriteState, type WriteState } from "@/core/web/lib/app-core/transfer/state";

const file = new File(Paths.document, "write-state.json");

/** Corrupt text throws StateError. The file is never reset silently. */
export async function loadWriteState(): Promise<WriteState> {
  return parseWriteState(file.exists ? await file.text() : null);
}

async function saveWriteState(state: WriteState): Promise<void> {
  if (!file.exists) file.create();
  await file.write(serializeWriteState(state));
}

let queue: Promise<unknown> = Promise.resolve();

/** Read, change and save in order, so two screens cannot overwrite each other's change. */
export function updateWriteState(change: (state: WriteState) => WriteState): Promise<WriteState> {
  const run = queue.then(async () => {
    const next = change(await loadWriteState());
    await saveWriteState(next);
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function dropPending(state: WriteState, uuid: string): WriteState {
  return { ...state, pending: Object.fromEntries(Object.entries(state.pending).filter(([key]) => key !== uuid)) };
}

export function dropLastWritten(state: WriteState, uuid: string): WriteState {
  return { ...state, lastWritten: Object.fromEntries(Object.entries(state.lastWritten).filter(([key]) => key !== uuid)) };
}
