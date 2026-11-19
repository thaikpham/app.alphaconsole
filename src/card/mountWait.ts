// Waits for the card after a mass-storage attach. Android can mount the card seconds after the USB attach, so the wait reads
// at once, reads again on each volume change, and polls slowly in case no change arrives. It ends when a read finds the card,
// on stop (detach), or after MOUNT_WAIT_MS. Pure: the read and the log line are passed in; the timers are the global ones.

export const MOUNT_POLL_MS = 2_000;
export const MOUNT_WAIT_MS = 60_000;

export type MountWait = {
  /** True from a mass-storage attach until a read finds the card, the wait is stopped, or the time runs out. */
  isWaiting(): boolean;
  subscribe(listener: () => void): () => void;
  /** Starts a wait and reads at once. A new attach during a wait starts the time over. */
  start(): void;
  /** Ends the wait. Called on detach. */
  stop(): void;
  /** A volume changed. While waiting, reads at once. */
  volumeChanged(state: string): void;
};

export type MountWaitOptions = {
  /** Starts a read. The promise resolves once the reader is idle. */
  read: (trigger: string) => Promise<void>;
  /** True once the last reading shows a card. Checked after each read the wait starts. */
  found: () => boolean;
  log?: (message: string) => void;
};

export function createMountWait(options: MountWaitOptions): MountWait {
  const { read, found, log = () => {} } = options;
  let waiting = false;
  let poll: ReturnType<typeof setInterval> | null = null;
  let limit: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  function setWaiting(next: boolean): void {
    if (waiting === next) return;
    waiting = next;
    for (const listener of listeners) listener();
  }

  function clearTimers(): void {
    if (poll !== null) clearInterval(poll);
    if (limit !== null) clearTimeout(limit);
    poll = null;
    limit = null;
  }

  function end(reason: string): void {
    clearTimers();
    log(`mount wait end ${reason}`);
    setWaiting(false);
  }

  function readFor(trigger: string): void {
    void read(trigger).then(() => {
      if (waiting && found()) end("found");
    });
  }

  return {
    isWaiting: () => waiting,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      clearTimers();
      setWaiting(true);
      log("mount wait start");
      limit = setTimeout(() => end("timeout"), MOUNT_WAIT_MS);
      poll = setInterval(() => readFor("mountPoll"), MOUNT_POLL_MS);
      readFor("usbAttach");
    },
    stop() {
      if (waiting) end("stop");
    },
    volumeChanged(state) {
      if (!waiting) return;
      log(`volume ${state}`);
      readFor("volumeChanged");
    },
  };
}
