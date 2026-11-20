import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { beginWrite, endWrite, readCard, userMessage, type CardReading } from "@/card/session";
import { useCardDriver } from "@/card/useCardDriver";
import { canPickCardFolder } from "@/card/webAccess";
import { content } from "@/content";
import { bytesToBase64 } from "@/core/web/lib/app-core/bases";
import { CARD_SETTING_DIR, compare, explicitPp, planWriteFor, slotFileName, type Family } from "@/core/web/lib/app-core/transfer/plan";
import { chooseFamily, newBackupId, recordFor } from "@/core/web/lib/app-core/transfer/state";
import type { PresetSet, SlotDraft } from "@/core/web/lib/presetSets";
import { setStore } from "@/storage/userSetsFile";
import { dropPending, updateWriteState } from "@/storage/writeState";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { CardStatusPanel } from "@/ui/CardStatusPanel";
import { GlassToolbar, GlassToolbarButton, GlassToolbarGroup, ToolbarSpacer } from "@/ui/GlassToolbar";
import { haptic } from "@/ui/haptics";
import { Loading } from "@/ui/Loading";
import { animatedSpring } from "@/ui/motion";
import { PinnedBar } from "@/ui/PinnedBar";
import { ProgressRing } from "@/ui/ProgressRing";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { Segmented } from "@/ui/Segmented";
import { StageStepper } from "@/ui/StageStepper";
import { StatusChip, type ChipTone } from "@/ui/StatusChip";
import { CheckIcon } from "@/ui/StatusIcons";
import { useReduceMotion } from "@/ui/useReduceMotion";
import { ValueRow } from "@/ui/ValueRow";
import { radii, spacing, useTheme } from "@/ui/theme";
import { durations, press, typeScale } from "@/ui/tokens";
import { ringCount, stageOf, stepIndex, type WritePhase } from "@/write/progress";
import { usbHint } from "@/write/usbHint";
import { WebWritePanel } from "@/write/WebWritePanel";
import { subscribeWriteProgress, writeFilesVerified, type WriteReport, type WriteStatus } from "../../modules/usb-volume";
import { fontFamily } from "@/ui/v21";

type Loaded = { reading: CardReading; set: PresetSet | null };

const noop = () => undefined;

const familyOptions: { value: Family; label: string }[] = [
  { value: "P", label: content.home.family.P },
  { value: "N", label: content.home.family.N },
];

const kept = content.edit.keep;

function settingRows(s: SlotDraft): { label: string; value: string }[] {
  return [
    { label: content.field.mode, value: s.mode && s.mode !== "keep" ? content.labels.mode[s.mode] : kept },
    { label: content.field.aperture, value: s.aperture === undefined || s.aperture === "keep" ? kept : String(s.aperture) },
    { label: content.field.shutter, value: s.shutter === undefined || s.shutter === "keep" ? kept : s.shutter },
    { label: content.field.iso, value: s.iso === undefined || s.iso === "keep" ? kept : String(s.iso) },
    {
      label: content.field.wb,
      value:
        !s.wb || s.wb === "keep"
          ? kept
          : s.wb.mode === "ctemp" && s.wb.kelvin !== undefined
            ? `${s.wb.kelvin}K`
            : content.labels.wbMode[s.wb.mode],
    },
    { label: content.field.ppOn, value: s.ppOn === undefined ? kept : s.ppOn ? content.edit.on : content.edit.off },
    { label: content.field.focus, value: !s.focus || s.focus === "keep" ? kept : content.labels.focus[s.focus] },
  ];
}

function statusTone(status: WriteStatus): ChipTone {
  if (status === "ok" || status === "restored") return "success";
  if (status === "error" || status === "restore-failed") return "danger";
  return "neutral";
}

/** Morphs a result in from press depth on the morph spring. Reduce Motion fades it only. */
function ResultMorph({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const run = reduce
      ? Animated.timing(enter, { toValue: 1, duration: durations.short, useNativeDriver: true })
      : animatedSpring(enter, 1, "morph");
    run.start();
    return () => run.stop();
  }, [enter, reduce]);

  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [press.button, 1] });
  return <Animated.View style={{ opacity: enter, transform: [{ scale: reduce ? 1 : scale }] }}>{children}</Animated.View>;
}

export default function Write() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { status: driver, usb } = useCardDriver();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickedFamily, setPickedFamily] = useState<Family | null>(null);
  const [statuses, setStatuses] = useState<Record<string, WriteStatus>>({});
  const [phase, setPhase] = useState<WritePhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [backupId, setBackupId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => content.write.recallChecklist.map(() => false));
  const usbMode = usb === "checking" || usb === null ? usb : usb.mode;
  const [seenUsbMode, setSeenUsbMode] = useState(usbMode);
  const [droppedFromPtp, setDroppedFromPtp] = useState(false);
  const phaseRef = useRef<WritePhase>(phase);
  // The driver kind the last read ran under: the kind at mount, then each settled kind the card was re-read for.
  const lastSettled = useRef<string>(driver.kind);

  // The camera left PTP and is unplugged: PC Remote was turned off, so the cable has to be plugged in again.
  if (usbMode !== seenUsbMode) {
    setSeenUsbMode(usbMode);
    setDroppedFromPtp(usbMode === null && seenUsbMode === "ptp");
  }
  // The browser has no USB state, so the USB hints do not apply to it.
  const hint = Platform.OS === "web" ? null : usbHint("write", usb, droppedFromPtp);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // One result haptic per outcome: success when the write is confirmed, error when the card was rolled back or kept.
  useEffect(() => {
    if (phase === "ok") haptic("success");
    else if (phase === "rolledBack" || phase === "kept") haptic("error");
  }, [phase]);

  // A new settled driver state while idle (a camera attached, a card readable) re-reads the card. Checking, reading and
  // mounting are not settled. A mount that began during one of them read the card too early, so its first settled
  // state re-reads too.
  useEffect(() => {
    if (driver.kind === "checking" || driver.kind === "reading" || driver.kind === "mounting") return;
    const prev = lastSettled.current;
    lastSettled.current = driver.kind;
    if (prev !== driver.kind && phaseRef.current === "idle") setNonce((n) => n + 1);
  }, [driver.kind]);

  useEffect(() => {
    let alive = true;
    Promise.all([readCard(), setStore.load()])
      .then(([reading, { bundled, user }]) => {
        if (!alive) return;
        const set = id ? ([...bundled, ...user].find((s) => s.id === id) ?? null) : null;
        setLoaded({ reading, set });
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (alive) setLoadError(userMessage(e, content.write.readFailed));
      });
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  const reading = loaded?.reading ?? null;
  const set = loaded?.set ?? null;
  const card = reading?.kind === "ready" ? reading.card : null;
  const choice = card ? chooseFamily(card.view.family, card.remembered) : null;
  const family: Family = (choice?.ask ? pickedFamily : null) ?? choice?.family ?? "P";

  // An absent or not yet read camera shows the connect guide, not an error.
  const waiting = !loadError && (!loaded || reading?.kind === "absent");
  let issue: readonly string[] | null = null;
  if (loadError) issue = [loadError];
  else if (loaded && !waiting) {
    if (reading?.kind === "noSony") issue = content.write.camera.unformatted;
    else if (reading?.kind === "readOnly" || reading?.kind === "unsupported") issue = [content.write.notWritable(reading.model.name)];
    else if (!set) issue = [content.write.blocked.setMissing];
    else if (card?.view.error) issue = [card.view.error];
  }
  const blocked = issue !== null;

  const plan = useMemo(() => {
    if (!card || !set || blocked) return null;
    try {
      return { files: planWriteFor(card.model, card.state, explicitPp(set), family), diff: compare(card.state, set, family) };
    } catch (e) {
      return { error: userMessage(e, content.write.planFailed) };
    }
  }, [card, set, family, blocked]);

  const files = plan && "files" in plan ? plan.files : null;
  const diff = plan && "diff" in plan ? plan.diff : null;
  // iOS cannot write yet (O1): canWrite stays false and the write button names the camera as not supported. A browser
  // without the card folder saves the files through WebWritePanel instead.
  const webShare = Platform.OS === "web" && !canPickCardFolder();
  const writeHere = Platform.OS === "android" || canPickCardFolder();
  const canWrite = writeHere && files !== null && (phase === "idle" || phase === "rolledBack");
  const writeLabel = writeHere || !card ? content.write.writeButton : content.presets.unwritable(card.model.name);
  const okFiles = Object.values(statuses).filter((s) => s === "ok").length;
  const stage = stageOf(phase, recallOpen);
  const recheck = () => setNonce((n) => n + 1);
  const toggleCheck = (i: number) => setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)));

  const chooseFamilyNow = (next: Family) => {
    if (!card) return;
    setPickedFamily(next);
    const uuid = card.uuid;
    void updateWriteState((s) => ({ ...s, families: { ...s.families, [uuid]: next } })).catch((e: unknown) =>
      setMessage(userMessage(e, content.write.stateFailed)),
    );
  };

  const checkCable = () => {
    setStatuses({});
    setMessage(null);
    setPhase("idle");
    recheck();
  };

  const write = async () => {
    if (!card || !set || !files || !canWrite) return;
    const uuid = card.uuid;
    const writeFamily = family;
    const startedAt = new Date().toISOString();
    const nextBackup = newBackupId(new Date());
    setMessage(null);
    setStatuses({});
    setBackupId(nextBackup);
    setPhase("writing");
    beginWrite(uuid);
    // The pending marker is saved before the card is touched. If it cannot be saved, nothing is written.
    try {
      await updateWriteState((s) => ({
        ...s,
        families: { ...s.families, [uuid]: writeFamily },
        pending: { ...s.pending, [uuid]: { backupId: nextBackup, setId: set.id, startedAt } },
      }));
    } catch (e) {
      endWrite(uuid);
      setPhase("idle");
      setMessage(userMessage(e, content.write.stateFailed));
      return;
    }
    const unsubscribe = subscribeWriteProgress((p) => setStatuses((prev) => ({ ...prev, [p.relPath]: p.status })));
    let report: WriteReport | null = null;
    try {
      report = await writeFilesVerified(
        files.map((f) => ({ relPath: f.relPath, base64: bytesToBase64(f.bytes) })),
        nextBackup,
      );
    } catch {
      report = null;
    } finally {
      unsubscribe();
    }
    try {
      if (report?.ok) {
        const record = recordFor(set.id, files, writeFamily, startedAt);
        await updateWriteState((s) => ({
          ...dropPending(s, uuid),
          lastWritten: { ...s.lastWritten, [uuid]: record },
        }));
        setPhase("ok");
      } else if (report?.rolledBack) {
        await updateWriteState((s) => dropPending(s, uuid));
        setPhase("rolledBack");
      } else {
        // Not confirmed: the pending marker stays, and the next read finishes or restores the card.
        setPhase("kept");
      }
    } catch {
      setPhase("kept");
    } finally {
      endWrite(uuid);
    }
  };

  let actions: ReactNode;
  if (stage === "connect") {
    actions = waiting ? (
      <Button label={content.write.camera.waiting} onPress={noop} disabled />
    ) : issue || webShare ? (
      <Button label={content.common.recheck} onPress={recheck} />
    ) : (
      <>
        <Button label={writeLabel} onPress={write} disabled={!canWrite} />
        <Button label={content.common.recheck} onPress={recheck} variant="secondary" />
      </>
    );
  } else if (stage === "writing") {
    actions = <Button label={content.write.doNotUnplug} onPress={noop} disabled />;
  } else if (stage === "done") {
    actions = <Button label={content.write.titles.recall} onPress={() => setRecallOpen(true)} />;
  } else if (stage === "failed") {
    actions =
      phase === "kept" ? (
        <Button label={content.write.blocked.toHome} onPress={() => router.navigate("/")} />
      ) : (
        <>
          <Button label={content.write.checkCable} onPress={checkCable} variant="secondary" />
          <Button label={content.common.retry} onPress={write} disabled={!canWrite} />
        </>
      );
  } else {
    actions = (
      <>
        <Button label={content.write.restore} onPress={() => router.push("/backups")} variant="secondary" />
        <Button label={content.write.preview} onPress={() => router.push("/preview")} />
        <Text style={[styles.note, { color: theme.secondary }]}>{content.write.previewHint}</Text>
      </>
    );
  }

  const slotCard =
    card && set ? (
      <Card>
        {set.slots.map((slot, i) => {
          const n = i + 1;
          const status = statuses[CARD_SETTING_DIR + slotFileName(n, family)];
          const changed = diff?.includes(n) ?? false;
          return (
            <View key={n} style={styles.slotRow}>
              <Text style={[styles.strong, { color: theme.label }]}>{`M${n} · ${slot.label}`}</Text>
              {status ? (
                <StatusChip label={content.write.status[status]} tone={statusTone(status)} />
              ) : diff ? (
                <StatusChip
                  label={changed ? content.write.diffChange : content.write.diffSame}
                  tone={changed ? "warning" : "success"}
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    ) : null;

  return (
    <Screen footer={<PinnedBar>{actions}</PinnedBar>}>
      <ScreenHeader title={content.write.titles[stage]} />
      <StageStepper stages={content.home.steps} current={stepIndex(stage)} />

      {stage === "connect" ? <CardStatusPanel /> : null}

      {stage === "connect" && waiting ? (
        <Card>
          {Platform.OS === "web" ? (
            <Text style={[styles.title, { color: theme.label }]}>{content.write.web.waiting}</Text>
          ) : hint === "ptpOff" ? (
            <>
              <Text style={[styles.title, { color: theme.label }]}>{content.write.camera.ptpLines[0]}</Text>
              <Text style={[typeScale.callout, { color: theme.label }]}>{content.write.camera.ptpLines[1]}</Text>
            </>
          ) : (
            <>
              {hint === "replug" ? (
                <Text style={[styles.title, { color: theme.label }]}>{content.write.camera.replug}</Text>
              ) : (
                <Loading label={content.write.camera.waiting} />
              )}
              {content.write.camera.guide.map((item) => (
                <View key={item.step} style={[styles.step, { borderTopColor: theme.separator }]}>
                  <Text style={[styles.strong, { color: theme.label }]}>{item.step}</Text>
                  {"note" in item && item.note ? <Text style={[styles.note, { color: theme.secondary }]}>{item.note}</Text> : null}
                </View>
              ))}
            </>
          )}
        </Card>
      ) : null}

      {stage === "connect" && issue ? (
        <Card>
          {issue.map((line, i) =>
            i === 0 ? (
              <Text key={line} style={[styles.strong, { color: theme.danger }]}>
                {line}
              </Text>
            ) : reading?.kind === "noSony" ? null : (
              <Text key={line} style={[styles.note, { color: theme.secondary }]}>
                {line}
              </Text>
            ),
          )}
          {reading?.kind === "noSony" ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsOpen }}
                onPress={() => setDetailsOpen((open) => !open)}
                style={styles.disclosure}
              >
                <Text style={[styles.strong, { color: theme.label }]}>{content.write.details}</Text>
              </Pressable>
              {detailsOpen
                ? issue.slice(1).map((line) => (
                    <Text key={line} style={[styles.note, { color: theme.secondary }]}>
                      {line}
                    </Text>
                  ))
                : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {stage === "connect" && !waiting && !blocked && card && set ? (
        <>
          <Card>
            <ValueRow label={content.presets.cameraRow} value={card.model.name} />
            <ValueRow label={content.write.setName} value={set.name} />
            {choice?.ask ? (
              <>
                <Text style={[styles.note, { color: theme.secondary }]}>{content.write.familyAsk}</Text>
                <Segmented<Family> options={familyOptions} value={family} onChange={chooseFamilyNow} />
              </>
            ) : null}
            {card.view.family !== null && card.matched === null ? (
              <Text style={[styles.note, { color: theme.secondary }]}>{content.write.mismatch}</Text>
            ) : null}
            {plan && "error" in plan ? <Text style={[styles.danger, { color: theme.danger }]}>{plan.error}</Text> : null}
          </Card>

          {webShare && files ? <WebWritePanel files={files} family={family} setId={set.id} uuid={card.uuid} /> : null}

          {slotCard}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
            onPress={() => setDetailsOpen((open) => !open)}
            style={styles.disclosure}
          >
            <Text style={[styles.strong, { color: theme.label }]}>{content.write.details}</Text>
          </Pressable>
          {detailsOpen ? (
            <Card>
              <Text style={[styles.strong, { color: theme.label }]}>{content.write.familyLine(family)}</Text>
              <Text style={[styles.strong, { color: theme.label }]}>{content.write.formatted}</Text>
              {set.slots.map((slot, i) => (
                <View key={i} style={styles.detail}>
                  <Text style={[styles.strong, { color: theme.label }]}>{`M${i + 1} · ${slot.label}`}</Text>
                  {settingRows(slot.settings).map((row) => (
                    <ValueRow key={row.label} label={row.label} value={row.value} />
                  ))}
                </View>
              ))}
            </Card>
          ) : null}

          {message ? <Text style={[styles.danger, { color: theme.danger }]}>{message}</Text> : null}
        </>
      ) : null}

      {stage === "writing" || stage === "done" || stage === "failed" ? (
        <View style={styles.ring}>
          <ProgressRing filled={ringCount(phase, okFiles)} />
        </View>
      ) : null}

      {stage === "done" ? (
        <ResultMorph>
          <Card>
            <Text style={[styles.title, { color: theme.label }]}>{content.write.written}</Text>
            {backupId ? <ValueRow label={content.write.backupId} value={backupId} /> : null}
          </Card>
          <GlassToolbar>
            <ToolbarSpacer />
            <GlassToolbarGroup>
              <GlassToolbarButton accessibilityLabel={content.common.done} onPress={() => router.navigate("/")}>
                <Text style={[typeScale.button, { color: theme.accentText }]}>{content.common.done}</Text>
              </GlassToolbarButton>
            </GlassToolbarGroup>
          </GlassToolbar>
        </ResultMorph>
      ) : null}

      {stage === "failed" ? (
        <Card>
          {phase === "kept" ? (
            <Text style={[styles.strong, { color: theme.danger }]}>{content.write.kept}</Text>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.label }]}>{content.write.keepOld}</Text>
              <Text style={[styles.note, { color: theme.secondary }]}>{content.write.rolledBack}</Text>
            </>
          )}
          {backupId ? <ValueRow label={content.write.backupId} value={backupId} /> : null}
        </Card>
      ) : null}

      {stage === "writing" || stage === "done" || stage === "failed" ? slotCard : null}

      {stage === "recall" ? (
        <Card>
          {content.write.recallChecklist.map((item, i) => (
            <Pressable
              key={item}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checked[i] }}
              onPress={() => toggleCheck(i)}
              style={styles.check}
            >
              <View
                style={[
                  styles.box,
                  { borderColor: theme.secondary, backgroundColor: checked[i] ? theme.fill : theme.card },
                ]}
              >
                {checked[i] ? <CheckIcon color={theme.label} size={14} /> : null}
              </View>
              <Text style={[typeScale.body, { color: theme.label }]}>{item}</Text>
            </Pressable>
          ))}
          <Text style={[styles.note, { color: theme.secondary }]}>{content.write.recallCaption}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typeScale.title3 },
  note: { ...typeScale.subhead },
  strong: { ...typeScale.subhead, fontFamily: fontFamily.semibold },
  danger: { ...typeScale.subhead, fontFamily: fontFamily.medium },
  ring: { alignItems: "center", paddingVertical: spacing.md },
  step:{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  disclosure: { paddingVertical: spacing.sm },
  detail: { gap: spacing.xs, paddingTop: spacing.sm },
  check: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.control,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
