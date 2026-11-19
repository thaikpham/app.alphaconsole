// Typed JS side of the local UsbPtp Expo module. The Kotlin code lives in android/. Live-view frames never reach JS:
// LiveView draws them natively and sends only fps.
import { requireNativeModule, requireNativeView, type EventEmitter, type EventSubscription } from "expo";
import type { StyleProp, ViewStyle } from "react-native";

export type PtpConnectInfo = { model: string; version: string; extVersion: number | null };
/** One GetAllExtDevicePropInfo row. [current] is null for strings, arrays and 128-bit values. */
export type PtpPropRow = { code: number; dataType: number; getSet: number; isEnabled: number; current: number | null };
export type PtpState = { status: "connected" | "disconnected" | "error"; message: string | null };
export type LiveFps = { fps: number };

type UsbPtpEvents = {
  state: (s: PtpState) => void;
  props: (e: { props: PtpPropRow[] }) => void;
};

type Native = {
  connect(): Promise<PtpConnectInfo>;
  disconnect(): Promise<void>;
  readProps(): Promise<PtpPropRow[]>;
  startLiveView(): Promise<void>;
  stopLiveView(): Promise<void>;
  /** Saves the newest frame for slot 1 to 4. Resolves with a file URI. */
  snapshot(slot: number): Promise<string>;
};

// expo-modules-core 58 types NativeModule<T> as a constructor type, so the instance type comes from EventEmitter.
const native = requireNativeModule<EventEmitter<UsbPtpEvents> & Native>("UsbPtp");

export type LiveViewProps = {
  style?: StyleProp<ViewStyle>;
  onFps?: (e: { nativeEvent: LiveFps }) => void;
};

/** Native view that draws live-view frames. */
export const LiveView = requireNativeView<LiveViewProps>("UsbPtp", "LiveView");

export const connect = () => native.connect();
export const disconnect = () => native.disconnect();
export const readProps = () => native.readProps();
export const startLiveView = () => native.startLiveView();
export const stopLiveView = () => native.stopLiveView();
export const snapshot = (slot: number) => native.snapshot(slot);

/** Calls back on disconnect, live-view failure, or link error. Returns a remover. */
export function subscribeState(onState: (s: PtpState) => void): () => void {
  const sub: EventSubscription = native.addListener("state", onState);
  return () => sub.remove();
}

/** Calls back with the rows after connect and about once a second during live view, only when they change. */
export function subscribeProps(onProps: (rows: PtpPropRow[]) => void): () => void {
  const sub: EventSubscription = native.addListener("props", (e) => onProps(e.props));
  return () => sub.remove();
}
