// The write state, kept in localStorage as write-state.json on the web. Same text and same update rules as the native file.
import { parseWriteState, serializeWriteState, type WriteState } from "@/core/web/lib/app-core/transfer/state";

const KEY = "write-state.json";

/** Corrupt text throws StateError. The state is never reset silently. */
export async function loadWriteState(): Promise<WriteState> {
  return parseWriteState(localStorage.getItem(KEY));
}

async function saveWriteState(state: WriteState): Promise<void> {
  localStorage.setItem(KEY, serializeWriteState(state));
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

// Copied from writeState.ts so the web build does not load expo-file-system.
export function dropPending(state: WriteState, uuid: string): WriteState {
  return { ...state, pending: Object.fromEntries(Object.entries(state.pending).filter(([key]) => key !== uuid)) };
}

export function dropLastWritten(state: WriteState, uuid: string): WriteState {
  return { ...state, lastWritten: Object.fromEntries(Object.entries(state.lastWritten).filter(([key]) => key !== uuid)) };
}
