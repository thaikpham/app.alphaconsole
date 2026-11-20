import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated from "react-native-reanimated";

import { readCard } from "@/card/session";
import { useCardDriver } from "@/card/useCardDriver";
import { content } from "@/content";
import { matchSlot } from "@/core/web/lib/app-core/preview/match";
import { formatCells, readPreview, type PreviewLabels } from "@/core/web/lib/app-core/preview/props";
import { latestWriteRecord } from "@/core/web/lib/app-core/transfer/state";
import type { PresetSet } from "@/core/web/lib/presetSets";
import { setStore } from "@/storage/userSetsFile";
import { loadWriteState } from "@/storage/writeState";
import { Button } from "@/ui/Button";
import { Glass } from "@/ui/Glass";
import { Loading } from "@/ui/Loading";
import { usePressScale } from "@/ui/motion";
import { PinnedBar } from "@/ui/PinnedBar";
import { ReadabilityScrim } from "@/ui/ReadabilityScrim";
import { Screen } from "@/ui/Screen";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { CheckIcon, WarningIcon } from "@/ui/StatusIcons";
import { settingsLine } from "@/ui/summaryLine";
import { radii, spacing, useTheme } from "@/ui/theme";
import { photoLabel, photoScrim, timing, typeScale } from "@/ui/tokens";
import { mismatchSummary } from "@/write/mismatch";
import { usbHint } from "@/write/usbHint";
import {
  LiveView,
  connect,
  disconnect,
  snapshot,
  startLiveView,
  stopLiveView,
  subscribeProps,
  subscribeState,
  type PtpPropRow,
} from "../../modules/usb-ptp";
import { subscribeUsb } from "../../modules/usb-volume";
import { fontFamily, roles } from "@/ui/v21";
import { CameraIcon } from "@/ui/Glyphs";
import { navHeader } from "@/ui/navHeader";

type Link = "connecting" | "connected" | "off";
/** SPEC 2.4.7: none = guide, checking = spinner in the hero frame, ok = live picture. */
type LiveState = "none" | "checking" | "ok";

const SLOTS = [1, 2, 3, 4] as const;
const labels: PreviewLabels = {
  wb: content.preview.wb,
  focus: content.labels.focus,
  metering: content.labels.metering,
  ppOff: content.preview.ppOff,
};

/** Error code of a native rejection (expo CodedException). */
function codeOf(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String(e.code) : undefined;
}

function connectMessage(e: unknown): string {
  const code = codeOf(e);
  if (code === "E_NO_DEVICE") return content.preview.noDevice;
  if (code === "E_PERMISSION") return content.preview.permission;
  return content.preview.connectFailed;
}

function liveMessage(e: unknown): string {
  return codeOf(e) === "E_LIVE_VIEW_OFF" ? content.preview.liveViewOff : content.preview.interrupted;
}

function snapshotMessage(e: unknown): string {
  return codeOf(e) === "E_NO_FRAME" ? content.preview.noFrame : content.preview.saveFailed;
}

/** Runs native calls one at a time. A stop then never overtakes the start it follows (the native stop is a no-op while a start is still queued). */
function serialize(queue: { current: Promise<unknown> }, task: () => Promise<unknown>): Promise<unknown> {
  queue.current = queue.current.then(task, task);
  return queue.current;
}

/**
 * The set the last write points at. The camera is compared with this set. The card's own record wins when the card is
 * readable. Without one (PTP mode: the card is not mounted) it is the newest record on any card.
 */
async function loadTarget(): Promise<PresetSet | null> {
  const reading = await readCard().catch(() => null);
  const card = reading?.kind === "ready" ? reading.card.lastWritten : null;
  const record = card ?? latestWriteRecord((await loadWriteState()).lastWritten);
  if (!record) return null;
  const { bundled, user } = await setStore.load();
  return [...bundled, ...user].find((s) => s.id === record.setId) ?? null;
}

export default function Preview() {
  const router = useRouter();
  const theme = useTheme();
  const snack = useSnackbar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { usb } = useCardDriver();
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // A connect is in flight, or the camera is connected. A second connect would drop the session that is up.
  const pendingRef = useRef(false);
  const linkedRef = useRef(false);

  const [link, setLink] = useState<Link>(Platform.OS === "web" ? "off" : "connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const [rows, setRows] = useState<PtpPropRow[]>([]);
  const [liveOn, setLiveOn] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [target, setTarget] = useState<PresetSet | null | undefined>(undefined);
  const [picked, setPicked] = useState<number | null>(null);
  const [shots, setShots] = useState<Partial<Record<number, string>>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);
  const closePress = usePressScale("button");

  // Sets state only in the promise callbacks, so it can run from the mount effect.
  const runConnect = useCallback(() => {
    pendingRef.current = true;
    connect()
      .then(() => {
        linkedRef.current = true;
        setLink("connected");
      })
      .catch((e: unknown) => {
        setLink("off");
        setNotice(connectMessage(e));
      })
      .finally(() => {
        pendingRef.current = false;
      });
  }, []);

  const attempt = useCallback(() => {
    setLink("connecting");
    setNotice(null);
    runConnect();
  }, [runConnect]);

  // Connection events and the first connect. Unmount disconnects. The browser has no camera link (it stays "off").
  useEffect(() => {
    if (Platform.OS === "web") return;
    const offState = subscribeState((s) => {
      if (s.status === "disconnected") {
        linkedRef.current = false;
        setLink("off");
        setNotice(content.preview.lost);
        setRows([]);
      } else if (s.status === "error") {
        setLiveOn(false);
        setLiveError(content.preview.interrupted);
      }
    });
    const offProps = subscribeProps(setRows);
    runConnect();
    return () => {
      offState();
      offProps();
    };
  }, [runConnect]);

  useEffect(() => {
    return () => {
      serialize(queue, disconnect).catch(() => undefined);
    };
  }, []);

  // Live view runs only while the screen is focused, the app is in the foreground, and the camera is connected.
  // A PTP camera that attaches while the screen is focused connects by itself, and live view starts on connect.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      let alive = true;
      loadTarget()
        .then((t) => {
          if (alive) setTarget(t);
        })
        .catch(() => {
          if (alive) setTarget(null);
        });
      const offUsb = subscribeUsb(
        (device) => {
          if (device.mode === "ptp" && !pendingRef.current && !linkedRef.current) attempt();
        },
        () => undefined,
      );
      return () => {
        alive = false;
        offUsb();
        setFocused(false);
      };
    }, [attempt]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);

  const live = focused && active && link === "connected";
  useEffect(() => {
    if (!live) return;
    let on = true;
    serialize(queue, startLiveView)
      .then(() => {
        if (on) {
          setLiveError(null);
          setLiveOn(true);
        }
      })
      .catch((e: unknown) => {
        if (on) setLiveError(liveMessage(e));
      });
    return () => {
      on = false;
      setLiveOn(false);
      serialize(queue, stopLiveView).catch(() => undefined);
    };
  }, [live]);

  // The PC Remote hint shows while the camera is not on PTP. PC Remote often reconnects by itself, so the replug line is a fallback after timing.replugFallbackMs.
  const hint = usbHint("preview", usb);
  const waitingPcRemote = hint === "pcRemoteOn" && link !== "connected";
  useEffect(() => {
    if (!waitingPcRemote) return;
    const timer = setTimeout(() => setFallback(true), timing.replugFallbackMs);
    return () => {
      clearTimeout(timer);
      setFallback(false);
    };
  }, [waitingPcRemote]);

  const reading = useMemo(() => {
    const readings = readPreview(rows);
    const cells = formatCells(readings, labels);
    const match = target && rows.length > 0 ? matchSlot(rows, target) : null;
    return { readings, cells, match };
  }, [rows, target]);

  // The slot being previewed (pv). It defaults to M1 and is chosen with the slot chips.
  const pv = picked ?? 1;
  const check = reading.match?.slots[pv - 1] ?? null;
  const selected = target?.slots[pv - 1]?.settings ?? null;
  const summary = selected && check ? mismatchSummary(reading.readings, selected, check, labels) : null;
  const settingsSegments = settingsLine(reading.readings, labels, selected, check);
  const matched = reading.match?.matched ?? null;
  const ready = target !== undefined && rows.length > 0;

  const save = async (slot: number) => {
    setSaving(slot);
    setSaveNote(null);
    try {
      const uri = await snapshot(slot);
      setShots((prev) => ({ ...prev, [slot]: uri }));
      snack.show(content.preview.shot(slot));
    } catch (e) {
      setSaveNote(snapshotMessage(e));
    } finally {
      setSaving(null);
    }
  };

  // The browser has no USB link, so it shows the same screen as the app with no camera connected (AlphaApp 06c).
  const shown = viewer ?? 1;
  const liveState: LiveState = liveOn ? "ok" : link === "connected" && !liveError ? "checking" : "none";
  const slotName = (n: number) => target?.slots[n - 1]?.label ?? content.intro.slotScenes[n - 1];
  // Slot segment marks: a green tick on the slot the camera matches, a warning on the shown slot when it differs.
  const segMark = (n: number): "ok" | "warn" | null =>
    !ready ? null : matched === n - 1 ? "ok" : n === pv && matched === null ? "warn" : null;

  const top = (
    <View style={[styles.seg, { backgroundColor: theme.separator }]} accessibilityRole="radiogroup">
      {SLOTS.map((n) => {
        const on = n === pv;
        const mark = segMark(n);
        return (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`M${n} · ${slotName(n)}`}
            onPress={() => setPicked(n)}
            style={styles.segHit}
          >
            <View style={[styles.segPill, on && [styles.segOn, { backgroundColor: theme.segmentOn }]]}>
              <Text style={[typeScale.subhead, { color: on ? theme.label : theme.secondary, fontFamily: on ? fontFamily.semibold : fontFamily.medium }]}>
                {`M${n}`}
              </Text>
              {mark === "ok" ? <CheckIcon color={theme.success} size={16} /> : null}
              {mark === "warn" ? <WarningIcon color={theme.warning} size={16} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Screen
      top={top}
      footer={
        <PinnedBar>
          <View style={styles.actions}>
            <View style={styles.grow}>
              <Button
                label={content.preview.editSlot}
                variant="secondary"
                disabled={!target}
                onPress={() => {
                  if (target) router.push({ pathname: "/sets/[id]/edit", params: { id: target.id } });
                }}
              />
            </View>
            <View style={styles.grow}>
              <Button label={content.preview.done} onPress={() => router.navigate("/")} />
            </View>
          </View>
        </PinnedBar>
      }
      overlay={<Snackbar state={snack.state} onDismiss={snack.hide} />}
    >
      <Stack.Screen options={navHeader({ title: content.preview.title })} />

      <View style={styles.live}>
        {liveState === "ok" ? (
          <>
            <LiveView style={StyleSheet.absoluteFill} />
            <ReadabilityScrim style={styles.scrim} />
            <View pointerEvents="none" style={[styles.gridV, { left: "33.33%" }]} />
            <View pointerEvents="none" style={[styles.gridV, { left: "66.66%" }]} />
            <View pointerEvents="none" style={[styles.gridH, { top: "33.33%" }]} />
            <View pointerEvents="none" style={[styles.gridH, { top: "66.66%" }]} />
            <Text style={[roles.titleBold, styles.mr]}>{`MR${pv}`}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={content.preview.enlarge}
              onPress={() => setFullscreen(true)}
              style={styles.fullBtn}
            >
              <View style={styles.corners}>
                <View style={[styles.corner, styles.cTL]} />
                <View style={[styles.corner, styles.cTR]} />
                <View style={[styles.corner, styles.cBL]} />
                <View style={[styles.corner, styles.cBR]} />
              </View>
            </Pressable>
          </>
        ) : (
          <View style={styles.guide}>
            <Text style={[roles.titleBold, styles.white]}>{content.preview.guideTitle}</Text>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Menu máy ảnh: ${content.preview.diagram.join(", ")}`}
              style={styles.menuPick}
            >
              <Text style={[roles.captionStrong, styles.white]}>{content.preview.diagram[0]}</Text>
              <Text style={[roles.captionStrong, styles.white]}>{content.preview.diagram[1]}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={attempt}
              disabled={link === "connecting" || liveState === "checking"}
              style={({ pressed }) => [styles.recheck, pressed && styles.recheckPressed]}
            >
              {link === "connecting" || liveState === "checking" ? <ActivityIndicator size="small" color="#0b0d12" /> : null}
              <Text style={[roles.title, styles.ink]}>{content.common.recheck}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {liveState === "none" ? (
        <>
          {notice ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{notice}</Text> : null}
          {liveError ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{liveError}</Text> : null}
          {fallback ? <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.preview.usb.replugFallback}</Text> : null}
        </>
      ) : null}

      {link === "connected" && ready ? (
        <View style={styles.settings}>
          {settingsSegments.map((segment, i) => (
            <View key={i} style={styles.settingsItem}>
              {i > 0 ? <Text style={[typeScale.subhead, { color: theme.secondary }]}>·</Text> : null}
              {segment.warn ? <WarningIcon color={theme.warning} size={15} /> : null}
              <Text
                style={[
                  typeScale.subhead,
                  { color: segment.warn ? theme.warning : theme.label, fontFamily: segment.warn ? fontFamily.semibold : fontFamily.regular },
                ]}
              >
                {segment.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {link === "connected" && !ready ? (
        <Loading label={target === undefined ? content.home.reading : content.preview.readingCamera} />
      ) : null}
      {summary ? <Text style={[typeScale.subhead, { color: theme.label }]}>{summary}</Text> : null}

      <View style={[styles.shots, { backgroundColor: theme.card }]}>
        <View style={styles.shotsHead}>
          <Text style={[roles.title, styles.shotsTitle, { color: theme.label }]}>{content.preview.snapshotsTitle}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !liveOn || saving !== null }}
            disabled={!liveOn || saving !== null}
            onPress={() => void save(pv)}
            style={({ pressed }) => [
              styles.shoot,
              { borderColor: theme.outline, backgroundColor: !liveOn ? theme.fill : pressed ? theme.fill : "transparent" },
            ]}
          >
            <CameraIcon color={liveOn ? theme.label : theme.secondary} size={18} />
            <Text style={[roles.labelSm, { color: liveOn ? theme.label : theme.secondary }]}>{content.preview.shoot(pv)}</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {SLOTS.map((n) => {
            const uri = shots[n];
            const on = n === pv;
            return (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`M${n} · ${slotName(n)}`}
                onPress={() => {
                  setPicked(n);
                  if (uri) setViewer(n);
                }}
                style={styles.cell}
              >
                <View style={[styles.thumb, on && uri ? { borderWidth: 2, borderColor: theme.label } : null]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.fill} resizeMode="cover" />
                  ) : (
                    <View style={[styles.empty, { borderColor: theme.disabled, backgroundColor: theme.fill }]}>
                      <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.preview.snapshotEmpty}</Text>
                    </View>
                  )}
                </View>
                <Text style={[typeScale.subhead, styles.cellLabel, { color: theme.label, fontFamily: on ? fontFamily.semibold : fontFamily.regular }]}>
                  {`M${n} · ${slotName(n)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {saving !== null ? (
          <Loading label={content.preview.snapshotSaving} />
        ) : saveNote ? (
          <Text style={[typeScale.subhead, { color: theme.danger }]}>{saveNote}</Text>
        ) : null}
      </View>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
          <View style={styles.fullscreen}>
            <LiveView style={StyleSheet.absoluteFill} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setFullscreen(false)}
              onPressIn={closePress.onPressIn}
              onPressOut={closePress.onPressOut}
              style={[styles.closeAnchor, { top: insets.top + spacing.md }]}
            >
              <Reanimated.View style={closePress.style}>
                <Glass overPhoto style={styles.closeGlass}>
                  <Text style={styles.closeText}>{content.preview.close}</Text>
                </Glass>
              </Reanimated.View>
            </Pressable>
          </View>
      </Modal>

      <Modal visible={viewer !== null} animationType="slide" onRequestClose={() => setViewer(null)}>
          <View
            style={[
              styles.viewer,
              { backgroundColor: theme.bg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
            ]}
          >
            <Text style={[typeScale.title3, styles.center, { color: theme.label }]}>{`M${shown}`}</Text>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={styles.pager}
              contentOffset={{ x: (shown - 1) * width, y: 0 }}
              onMomentumScrollEnd={(e) => setViewer(Math.round(e.nativeEvent.contentOffset.x / width) + 1)}
            >
              {SLOTS.map((n) => {
                const uri = shots[n];
                return (
                  <View key={n} style={[styles.page, { width }]}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.pageImage} resizeMode="contain" />
                    ) : (
                      <Text style={[typeScale.subhead, styles.center, { color: theme.secondary }]}>
                        {`M${n} · ${content.preview.snapshotEmpty}`}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            {saving !== null ? <Loading label={content.preview.snapshotSaving} /> : null}
            <View style={styles.viewerActions}>
              <Button
                label={content.preview.recapture}
                variant="secondary"
                disabled={!liveOn || saving !== null}
                onPress={() => void save(shown)}
              />
              <Button label={content.preview.close} onPress={() => setViewer(null)} />
            </View>
          </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: "#ffffff" },
  ink: { color: "#0b0d12" },
  seg: { flexDirection: "row", borderRadius: radii.pill },
  segHit: { flex: 1, minWidth: 0, height: 48, padding: 4 },
  segPill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radii.pill },
  segOn: { boxShadow: "0 1px 2px rgba(11, 13, 18, 0.14)" },
  // Live frame (AlphaApp screen 6): 16:9, radius 24, near-black with a faint inner line.
  live: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 24,
    backgroundColor: "#0b0d12",
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  scrim: { top: "50%" },
  gridV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255, 255, 255, 0.18)" },
  gridH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255, 255, 255, 0.18)" },
  mr: { position: "absolute", left: 16, bottom: 12, color: "#ffffff", textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  fullBtn: { position: "absolute", right: 8, bottom: 8, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255, 255, 255, 0.18)", alignItems: "center", justifyContent: "center" },
  corners: { width: 18, height: 18 },
  corner: { position: "absolute", width: 6, height: 6, borderColor: "#ffffff" },
  cTL: { left: 0, top: 0, borderLeftWidth: 2.2, borderTopWidth: 2.2, borderTopLeftRadius: 2 },
  cTR: { right: 0, top: 0, borderRightWidth: 2.2, borderTopWidth: 2.2, borderTopRightRadius: 2 },
  cBL: { left: 0, bottom: 0, borderLeftWidth: 2.2, borderBottomWidth: 2.2, borderBottomLeftRadius: 2 },
  cBR: { right: 0, bottom: 0, borderRightWidth: 2.2, borderBottomWidth: 2.2, borderBottomRightRadius: 2 },
  guide: { flex: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, justifyContent: "center", gap: 10 },
  menuPick: { height: 44, borderRadius: 8, backgroundColor: "#c2410c", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: spacing.md },
  recheck: { alignSelf: "flex-start", height: 48, paddingHorizontal: 18, borderRadius: radii.pill, backgroundColor: "#ffffff", flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recheckPressed: { backgroundColor: "#e3e6eb" },
  settings: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 5, rowGap: 4, paddingHorizontal: 2 },
  settingsItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  shots: { borderRadius: 24, paddingTop: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  shotsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingLeft: spacing.sm },
  shotsTitle: { lineHeight: 26 },
  shoot: { height: 48, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: spacing.s6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  // Two per row: (100% − 12) / 2.
  cell: { width: "47%", flexGrow: 1, gap: spacing.s6 },
  thumb: { width: "100%", aspectRatio: 3 / 2, borderRadius: 14, overflow: "hidden", backgroundColor: "#2a2f38" },
  fill: { width: "100%", height: "100%" },
  empty: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  cellLabel: { lineHeight: 22 },
  actions: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1 },
  fullscreen: { flex: 1, backgroundColor: photoScrim },
  closeAnchor: { position: "absolute", right: spacing.lg },
  closeGlass: {
    borderRadius: radii.pill,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  closeText: { ...typeScale.button, color: photoLabel },
  center: { textAlign: "center" },
  viewer: { flex: 1, padding: spacing.lg, gap: spacing.md },
  pager: { flex: 1 },
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageImage: { width: "100%", height: "100%" },
  viewerActions: { gap: spacing.sm },
});
