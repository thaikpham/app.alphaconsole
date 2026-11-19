// Card reads for the screens. One read runs at a time. Triggers that arrive while one runs join a single trailing read,
// so a burst of focus, app-state and USB events costs at most one more read after the running one.
// The last reading stays on screen while a read runs (stale-while-revalidate); only a detach clears it.
// Pure: the read and the log line are passed in, so the rules are testable without the native module.

export type ReaderState<T> = {
  /** Last published reading. Null until the first read finishes. */
  reading: T | null;
  /** True from the first request until no read is running or queued. */
  busy: boolean;
  /** The error of the latest read, until a later read succeeds. The reading stays as it was. */
  failure: { error: unknown } | null;
};

export type CardReader<T> = {
  getState(): ReaderState<T>;
  subscribe(listener: () => void): () => void;
  /** Starts a read, or joins the one running. The promise resolves once the reader is idle. */
  request(trigger: string): Promise<void>;
  /** The card left: the reading becomes [detached] now, and a read that is running or queued is dropped. */
  detach(): void;
};

export type CardReaderOptions<T> = {
  read: () => Promise<T>;
  detached: T;
  log?: (message: string) => void;
};

export function createCardReader<T>(options: CardReaderOptions<T>): CardReader<T> {
  const { read, detached, log = () => {} } = options;
  let state: ReaderState<T> = { reading: null, busy: false, failure: null };
  const listeners = new Set<() => void>();
  /** Bumped by detach. A read started before the bump is dropped when it ends. */
  let generation = 0;
  let pending = false;
  let draining = false;
  let idle: Promise<void> = Promise.resolve();

  function update(next: Partial<ReaderState<T>>): void {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  async function drain(): Promise<void> {
    while (pending) {
      pending = false;
      const gen = generation;
      const superseded = () => pending || gen !== generation;
      const t0 = Date.now();
      try {
        const value = await read();
        log(`read ${Date.now() - t0} ms dropped=${superseded()}`);
        if (!superseded()) update({ reading: value, failure: null });
      } catch (error) {
        log(`read failed ${Date.now() - t0} ms dropped=${superseded()}`);
        if (!superseded()) update({ failure: { error } });
      }
    }
    draining = false;
    update({ busy: false });
  }

  function request(trigger: string): Promise<void> {
    const joined = draining;
    pending = true;
    log(`request ${trigger} ${joined ? "joined" : "started"}`);
    update({ busy: true });
    if (!draining) {
      draining = true;
      idle = drain();
    }
    return idle;
  }

  function detach(): void {
    generation++;
    pending = false;
    log("detach");
    update({ reading: detached, busy: false, failure: null });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    request,
    detach,
  };
}
