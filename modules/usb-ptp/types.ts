// Types shared by index.ts (native) and web.tsx, kept apart so the web entry has no import cycle.
import type { StyleProp, ViewStyle } from "react-native";

export type PtpConnectInfo = { model: string; version: string; extVersion: number | null };
/** One GetAllExtDevicePropInfo row. [current] is null for strings, arrays and 128-bit values. */
export type PtpPropRow = { code: number; dataType: number; getSet: number; isEnabled: number; current: number | null };
export type PtpState = { status: "connected" | "disconnected" | "error"; message: string | null };
export type LiveFps = { fps: number };

export type LiveViewProps = {
  style?: StyleProp<ViewStyle>;
  onFps?: (e: { nativeEvent: LiveFps }) => void;
};
