import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useFocusEffect, useRouter } from "expo-router";
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
import { Card } from "@/ui/Card";
import { Glass } from "@/ui/Glass";
import { GlassToolbar, GlassToolbarButton, GlassToolbarGroup, ToolbarSpacer } from "@/ui/GlassToolbar";
import { Loading } from "@/ui/Loading";
import { usePressScale } from "@/ui/motion";
import { PinnedBar } from "@/ui/PinnedBar";
import { ReadabilityScrim } from "@/ui/ReadabilityScrim";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { SlotChips } from "@/ui/SlotChips";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { StatusChip } from "@/ui/StatusChip";
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
import { fontFamily } from "@/ui/v21";

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

  const [link, setLink] = useState<Link>("connecting");
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

  // Connection events and the first connect. Unmount disconnects. The browser has no camera link (see the early return).
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
  const statusText = !target
    ? content.preview.noTarget
    : matched !== null
      ? content.preview.matched(matched + 1)
      : content.preview.noMatch;
  const ready = target !== undefined && rows.length > 0;
  const slotItems = SLOTS.map((n) => ({ id: String(n), label: `M${n}` }));

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

  // The live preview runs over the camera's USB link, which only Android has. The browser shows the note instead.
  if (Platform.OS === "web") {
    return (
      <Screen
        footer={
          <PinnedBar>
            <Button label={content.preview.done} onPress={() => router.navigate("/")} />
          </PinnedBar>
        }
      >
        <ScreenHeader title={content.preview.title} />
        <Card>
          <Text style={[typeScale.callout, { color: theme.label }]}>{content.preview.androidOnly}</Text>
        </Card>
      </Screen>
    );
  }

  const shown = viewer ?? 1;
  // The hero frame is full width, from the top of the screen under the status bar. The toolbar floats over it.
  // With live state none, the toolbar floats over the content and the content starts below it.
  const liveState: LiveState = liveOn ? "ok" : link === "connected" && !liveError ? "checking" : "none";
  const onPhoto = liveState === "ok";
  const overHero = liveState !== "none";
  const labelColor = overHero ? photoLabel : theme.label;
  const toolbarTop = insets.top + spacing.sm;
  const toolbarRoom = toolbarTop + (Platform.OS === "android" ? 48 : 44) + spacing.md;
  const heroHeight = (width * 9) / 16;

  return (
    <Screen
      footer={
        <PinnedBar>
          <Button
            label={content.preview.editSlot}
            variant="secondary"
            disabled={!target}
            onPress={() => {
              if (target) router.push({ pathname: "/sets/[id]/edit", params: { id: target.id } });
            }}
          />
          <Button label={content.preview.done} onPress={() => router.navigate("/")} />
        </PinnedBar>
      }
      overlay={
        <>
          <GlassToolbar style={[styles.toolbar, { top: toolbarTop }]}>
            <GlassToolbarGroup overPhoto={overHero}>
              <GlassToolbarButton
                accessibilityLabel={content.common.back}
                onPress={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
              >
                <Text style={[typeScale.subhead, { color: labelColor }]}>{content.common.back}</Text>
              </GlassToolbarButton>
            </GlassToolbarGroup>
            <ToolbarSpacer />
            <GlassToolbarGroup overPhoto={overHero}>
              <GlassToolbarButton
                accessibilityLabel={content.preview.shoot(pv)}
                disabled={!liveOn || saving !== null}
                onPress={() => void save(pv)}
              >
                <Text style={[typeScale.subhead, { color: labelColor }]}>{content.preview.shoot(pv)}</Text>
              </GlassToolbarButton>
              <GlassToolbarButton
                accessibilityLabel={content.preview.enlarge}
                disabled={!onPhoto}
                onPress={() => setFullscreen(true)}
              >
                <Text style={[typeScale.subhead, { color: labelColor }]}>{content.preview.enlarge}</Text>
              </GlassToolbarButton>
            </GlassToolbarGroup>
          </GlassToolbar>
          <Snackbar state={snack.state} onDismiss={snack.hide} />
        </>
      }
    >
      {overHero ? (
        <View style={[styles.hero, { height: heroHeight }]}>
          <LiveView style={StyleSheet.absoluteFill} />
          {liveState === "checking" ? (
            <View style={styles.cover}>
              <Loading label={content.preview.startingLive} />
            </View>
          ) : null}
          {onPhoto ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={content.preview.enlarge}
              onPress={() => setFullscreen(true)}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <ReadabilityScrim style={styles.scrim} />
          <View pointerEvents="none" style={styles.liveLabel}>
            <Text style={[typeScale.subhead, { color: photoLabel }]}>{content.preview.liveAria}</Text>
          </View>
        </View>
      ) : (
        <View style={{ height: toolbarRoom }} />
      )}

      <Text accessibilityRole="header" style={[typeScale.title2, { color: theme.label }]}>
        {content.preview.title}
      </Text>

      <SlotChips slots={slotItems} value={String(pv)} onChange={(id) => setPicked(Number(id))} />

      {liveState === "none" ? (
        <Card>
          <Text style={[typeScale.title3, { color: theme.label }]}>{content.preview.guideTitle}</Text>
          <View style={styles.row}>
            {content.preview.diagram.map((item) => (
              <StatusChip key={item} label={item} />
            ))}
          </View>
          {hint === "pcRemoteOn" ? <Text style={[typeScale.callout, { color: theme.label }]}>{content.preview.usb.pcRemoteOn}</Text> : null}
          {notice ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{notice}</Text> : null}
          {liveError ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{liveError}</Text> : null}
          {fallback ? <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.preview.usb.replugFallback}</Text> : null}
          {link === "connecting" ? (
            <Loading label={content.preview.connecting} />
          ) : (
            <Button label={content.common.recheck} onPress={attempt} variant="secondary" />
          )}
        </Card>
      ) : null}

      {link === "connected" ? (
        <Card>
          {ready ? (
            <>
              <View style={styles.statusRow}>
                {matched !== null ? <CheckIcon color={theme.success} size={14} /> : null}
                <Text
                  style={[
                    typeScale.callout,
                    styles.statusText,
                    {
                      color: matched !== null ? theme.success : theme.warning,
                      fontFamily: fontFamily.semibold,
                    },
                  ]}
                >
                  {statusText}
                </Text>
              </View>
              <View style={styles.settings}>
                {settingsSegments.map((segment, i) => (
                  <View key={i} style={styles.settingsItem}>
                    {i > 0 ? <Text style={[typeScale.subhead, { color: theme.label }]}>{" · "}</Text> : null}
                    {segment.warn ? <WarningIcon color={theme.warning} size={12} /> : null}
                    <Text style={[typeScale.subhead, { color: segment.warn ? theme.warning : theme.label }]}>{segment.text}</Text>
                  </View>
                ))}
              </View>
              {summary ? (
                <>
                  <StatusChip label={content.preview.mismatch} tone="warning" />
                  <Text style={[typeScale.subhead, { color: theme.label }]}>{summary}</Text>
                </>
              ) : null}
            </>
          ) : (
            <Loading label={target === undefined ? content.home.reading : content.preview.readingCamera} />
          )}
        </Card>
      ) : null}

      <Card>
        <Text style={[typeScale.title3, { color: theme.label }]}>{content.preview.snapshotsTitle}</Text>
        <View style={styles.strip}>
          {SLOTS.map((n) => {
            const uri = shots[n];
            return (
              <View key={n} style={styles.slot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`M${n}`}
                  onPress={() => {
                    if (uri) setViewer(n);
                    else void save(n);
                  }}
                  style={[styles.thumb, { backgroundColor: theme.fill }]}
                >
                  {uri ? (
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <Text style={[typeScale.subhead, styles.center, { color: theme.secondary }]}>
                      {content.preview.snapshotEmpty}
                    </Text>
                  )}
                </Pressable>
                <Text style={[typeScale.subhead, styles.center, { color: theme.secondary }]}>
                  {`M${n} · ${content.intro.slotScenes[n - 1]}`}
                </Text>
              </View>
            );
          })}
        </View>
        {saving !== null ? (
          <Loading label={content.preview.snapshotSaving} />
        ) : saveNote ? (
          <Text style={[typeScale.subhead, { color: theme.danger }]}>{saveNote}</Text>
        ) : null}
      </Card>

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
  // Full width, starts at y = 0 so the picture runs under the status bar and Dynamic Island.
  hero: { marginTop: -spacing.lg, marginHorizontal: -spacing.lg, overflow: "hidden", backgroundColor: photoScrim },
  cover: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  // Dark fade only over the lower half of the picture, under the label.
  scrim: { top: "50%" },
  liveLabel: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md },
  toolbar: { position: "absolute", left: spacing.lg, right: spacing.lg },
  closeAnchor: { position: "absolute", right: spacing.lg },
  closeGlass: {
    borderRadius: radii.pill,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusText: { flexShrink: 1 },
  settings: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  settingsItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  center: { textAlign: "center" },
  strip: { flexDirection: "row", gap: spacing.sm },
  slot: { flex: 1, gap: spacing.xs },
  thumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.control,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreen: { flex: 1, backgroundColor: photoScrim },
  closeText: { ...typeScale.button, color: photoLabel },
  viewer: { flex: 1, padding: spacing.lg, gap: spacing.md },
  pager: { flex: 1 },
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageImage: { width: "100%", height: "100%" },
  viewerActions: { gap: spacing.sm },
});
