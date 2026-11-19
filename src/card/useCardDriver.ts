// The card session for the whole app (D9): USB and volume events, the app-state re-read, the mount wait and the
// folder picker offer. Mounted once in the root layout. Screens read the shared state through useCardDriver.
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { cardReader, grantCardFolder, mountWait, type CardReading } from "@/card/session";
import { cardLine, type CardLine, type UsbStatus } from "@/card/status";
import { aclLog } from "@/card/timing";
import { getUsbState, hasAllFilesAccess, subscribeUsb, subscribeVolumes } from "../../modules/usb-volume";

export type CardDriver = {
  /** Null until the first access check. False means all-files access is refused. */
  access: boolean | null;
  accessChecked: boolean;
  /** Set by "Để sau" for this session. Until then, onboarding replaces the screen while access is refused. */
  deferred: boolean;
  defer: () => void;
  /** The last reading, whether a read runs, and the latest read's failure. */
  reading: CardReading | null;
  busy: boolean;
  failure: { error: unknown } | null;
  waiting: boolean;
  status: CardLine;
  /** The attached camera's USB device, "checking" until the first state is known, or null when none is attached. */
  usb: UsbStatus;
};

const CardDriverContext = createContext<CardDriver | null>(null);

export function CardDriverProvider({ children }: { children: ReactNode }) {
  const [usb, setUsb] = useState<UsbStatus>("checking");
  const [access, setAccess] = useState<boolean | null>(null);
  /** True once the first check has settled, even when it failed (then access stays null). */
  const [accessChecked, setAccessChecked] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const { reading, busy, failure } = useSyncExternalStore(cardReader.subscribe, cardReader.getState);
  const waiting = useSyncExternalStore(mountWait.subscribe, mountWait.isWaiting);
  /** The folder picker opens once per USB attach, so a cancelled picker does not reopen by itself. */
  const pickerOffered = useRef(false);

  const checkAccess = useCallback(async () => {
    setAccess(await hasAllFilesAccess().catch(() => null));
  }, []);

  const defer = useCallback(() => setDeferred(true), []);

  useEffect(() => {
    let alive = true;
    hasAllFilesAccess()
      .catch(() => null)
      .then((ok) => {
        if (!alive) return;
        setAccess(ok);
        setAccessChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Settings and the picker take the app to the background. On return, check the access again and read the card.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void checkAccess();
      void cardReader.request("appstate");
    });
    return () => sub.remove();
  }, [checkAccess]);

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeUsb(
      (device) => {
        setUsb(device);
        pickerOffered.current = false;
        aclLog(`usb attach mode=${device.mode}`);
        if (device.mode === "mass-storage") mountWait.start();
        else void cardReader.request("usbAttach");
      },
      () => {
        setUsb(null);
        mountWait.stop();
        cardReader.detach();
      },
    );
    getUsbState()
      .catch(() => null)
      .then((device) => {
        if (alive) setUsb((prev) => (prev === "checking" ? device : prev));
      });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  // A volume change (Android 11+) reads the card at once while a mount wait runs. See mountWait.ts.
  useEffect(() => subscribeVolumes((change) => mountWait.volumeChanged(change.state)), []);

  const status = cardLine(usb, reading, waiting);
  const offerPicker =
    access === false &&
    deferred &&
    usb !== "checking" &&
    usb?.mode === "mass-storage" &&
    !busy &&
    !waiting &&
    reading?.kind === "absent";

  useEffect(() => {
    if (!offerPicker || pickerOffered.current) return;
    pickerOffered.current = true;
    void grantCardFolder().then((outcome) => {
      if (outcome === "granted") void cardReader.request("picker");
    });
  }, [offerPicker]);

  const value: CardDriver = {
    access,
    accessChecked,
    deferred,
    defer,
    reading,
    busy,
    failure,
    waiting,
    status,
    usb,
  };
  return createElement(CardDriverContext.Provider, { value }, children);
}

export function useCardDriver(): CardDriver {
  const value = useContext(CardDriverContext);
  if (value === null) throw new Error("useCardDriver is used outside CardDriverProvider");
  return value;
}
