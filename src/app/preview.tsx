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
import { Glass, ModalScope } from "@/ui/Glass";
import { Loading } from "@/ui/Loading";
import { PinnedBar } from "@/ui/PinnedBar";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { SlotChips } from "@/ui/SlotChips";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { StatusChip } from "@/ui/StatusChip";
import { settingsLine } from "@/ui/summaryLine";
import { radii, spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";
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

type Link = "connecting" | "connected" | "off";

const SLOTS = [1, 2, 3, 4] as const;
/** The replug line is a fallback: PC Remote on reconnects by itself, so the line waits this long first. */
const REPLUG_FALLBACK_MS = 8000;
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

  // The PC Remote hint shows while the camera is not on PTP. The replug line is only a fallback after REPLUG_FALLBACK_MS.
  const hint = usbHint("preview", usb);
  const waitingPcRemote = hint === "pcRemoteOn" && link !== "connected";
  useEffect(() => {
    if (!waitingPcRemote) return;
    const timer = setTimeout(() => setFallback(true), REPLUG_FALLBACK_MS);
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
  const slotItems = SLOTS.map((n) => ({ id: String(n), label: matched === n - 1 ? `M${n} ✓` : `M${n}` }));

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
      overlay={<Snackbar state={snack.state} onDismiss={snack.hide} />}
    >
      <ScreenHeader title={content.preview.title} />

      <SlotChips slots={slotItems} value={String(pv)} onChange={(id) => setPicked(Number(id))} />

      {link === "connected" ? (
        <View style={styles.frame}>
          <LiveView style={StyleSheet.absoluteFill} />
          {!liveOn && !liveError ? (
            <View style={styles.cover}>
              <Loading label={content.preview.startingLive} />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={content.preview.enlarge}
            onPress={() => setFullscreen(true)}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.liveLabel}>
            <Glass onImage style={styles.liveGlass}>
              <Text style={[typeScale.subhead, { color: "#fff" }]}>{content.preview.liveAria}</Text>
            </Glass>
          </View>
        </View>
      ) : (
        <Card>
          <Text style={[typeScale.title3, { color: theme.label }]}>{content.preview.guideTitle}</Text>
          <View style={styles.row}>
            {content.preview.diagram.map((item) => (
              <StatusChip key={item} label={item} />
            ))}
          </View>
          {hint === "pcRemoteOn" ? <Text style={[typeScale.callout, { color: theme.label }]}>{content.preview.usb.pcRemoteOn}</Text> : null}
          {notice ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{notice}</Text> : null}
          {fallback ? <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.preview.usb.replugFallback}</Text> : null}
          {link === "connecting" ? (
            <Loading label={content.preview.connecting} />
          ) : (
            <Button label={content.common.recheck} onPress={attempt} variant="secondary" />
          )}
        </Card>
      )}

      {liveError ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{liveError}</Text> : null}

      {link === "connected" ? (
        <Card>
          {ready ? (
            <>
              <Text
                style={[
                  typeScale.callout,
                  {
                    color: matched !== null ? theme.success : theme.warning,
                    fontWeight: "600",
                  },
                ]}
              >
                {statusText}
              </Text>
              <Text style={[typeScale.subhead, { color: theme.label }]}>
                {settingsSegments.map((segment, i) => (
                  <Text key={i} style={segment.warn ? { color: theme.warning } : undefined}>
                    {`${i > 0 ? " · " : ""}${segment.warn ? "▲ " : ""}${segment.text}`}
                  </Text>
                ))}
              </Text>
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
        <Button
          label={content.preview.shoot(pv)}
          variant="secondary"
          disabled={!liveOn || saving !== null}
          onPress={() => void save(pv)}
        />
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
        <ModalScope>
          <View style={styles.fullscreen}>
            <LiveView style={StyleSheet.absoluteFill} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setFullscreen(false)}
              style={({ pressed }) => [styles.closeAnchor, { top: insets.top + spacing.md }, pressed && styles.pressed]}
            >
              <Glass onImage style={styles.closeGlass}>
                <Text style={styles.closeText}>{content.preview.close}</Text>
              </Glass>
            </Pressable>
          </View>
        </ModalScope>
      </Modal>

      <Modal visible={viewer !== null} animationType="slide" onRequestClose={() => setViewer(null)}>
        <ModalScope>
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
        </ModalScope>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  cover: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  liveLabel: { position: "absolute", top: spacing.md, left: spacing.md },
  liveGlass: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  closeAnchor: { position: "absolute", right: spacing.lg },
  closeGlass: { borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  pressed: { transform: [{ scale: 0.96 }] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
  fullscreen: { flex: 1, backgroundColor: "#000" },
  closeText: { ...typeScale.button, color: "#fff" },
  viewer: { flex: 1, padding: spacing.lg, gap: spacing.md },
  pager: { flex: 1 },
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageImage: { width: "100%", height: "100%" },
  viewerActions: { gap: spacing.sm },
});
