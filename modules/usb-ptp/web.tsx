// Web side of the UsbPtp module. PTP (tethered control and live view) needs the Android USB host API, so on the web
// every call that needs the camera rejects and LiveView shows a note. Names and types follow index.ts.
import { StyleSheet, Text, View } from "react-native";

import { content } from "@/content";
import { spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";
import type { LiveViewProps, PtpConnectInfo, PtpPropRow, PtpState } from "./types";

export type { LiveFps, LiveViewProps, PtpConnectInfo, PtpPropRow, PtpState } from "./types";

function unsupported(): Promise<never> {
  return Promise.reject(new Error(content.preview.androidOnly));
}

export const connect: () => Promise<PtpConnectInfo> = unsupported;
export const disconnect: () => Promise<void> = () => Promise.resolve();
export const readProps: () => Promise<PtpPropRow[]> = () => Promise.resolve([]);
export const startLiveView: () => Promise<void> = unsupported;
export const stopLiveView: () => Promise<void> = () => Promise.resolve();
export const snapshot: (slot: number) => Promise<string> = unsupported;

/** No camera events on the web. Returns a remover that does nothing. */
export const subscribeState: (onState: (s: PtpState) => void) => () => void = () => () => undefined;

/** No camera events on the web. Returns a remover that does nothing. */
export const subscribeProps: (onProps: (rows: PtpPropRow[]) => void) => () => void = () => () => undefined;

/** Stands in for the live-view surface: the same box, with the Android-only note in it. */
export function LiveView({ style }: LiveViewProps) {
  const theme = useTheme();
  return (
    <View style={[styles.box, style]}>
      <Text style={[styles.note, { color: theme.secondary }]}>{content.preview.androidOnly}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  note: { ...typeScale.subhead, textAlign: "center" },
});
