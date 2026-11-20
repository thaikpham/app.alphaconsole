import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { beginWrite, endWrite, readCard, userMessage, type CardReading } from "@/card/session";
import { restoreCardBackup } from "@/card/restore";
import { useCardDriver } from "@/card/useCardDriver";
import { canPickCardFolder } from "@/card/webAccess";
import { content } from "@/content";
import { DEFAULT_MODEL } from "@/core/web/lib/app-core/models";
import { bytesToBase64 } from "@/core/web/lib/app-core/bases";
import { explicitPp, planWriteFor, type Family } from "@/core/web/lib/app-core/transfer/plan";
import { chooseFamily, newBackupId, recordFor } from "@/core/web/lib/app-core/transfer/state";
import type { PresetSet } from "@/core/web/lib/presetSets";
import { setStore } from "@/storage/userSetsFile";
import { dropPending, updateWriteState } from "@/storage/writeState";
import { Button } from "@/ui/Button";
import { haptic } from "@/ui/haptics";
import { PinnedBar } from "@/ui/PinnedBar";
import { ProgressRing } from "@/ui/ProgressRing";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import {
  ConnectHero,
  DrivePickerArt,
  MassStorageArt,
  ModePicture,
  PowerPicture,
  RecallItem,
  RecallWarning,
  RestoreSheet,
  ResultDisc,
  SlotPhotos,
  StepCard,
  UnplugPicture,
  WaitingLine,
  WarnGlyph,
  WarnPill,
} from "@/write/V21Parts";
import { Segmented } from "@/ui/Segmented";
import { radii, spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";
import { ringCount, stageOf, type WritePhase } from "@/write/progress";
import { usbHint } from "@/write/usbHint";
import { WebWritePanel } from "@/write/WebWritePanel";
import { subscribeWriteProgress, writeFilesVerified, type WriteReport, type WriteStatus } from "../../modules/usb-volume";
import { fontFamily, roles } from "@/ui/v21";

type Loaded = { reading: CardReading; set: PresetSet | null };

const noop = () => undefined;

const familyOptions: { value: Family; label: string }[] = [
  { value: "P", label: content.home.family.P },
  { value: "N", label: content.home.family.N },
];


export default function Write() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { status: driver, usb, access, grantAccess } = useCardDriver();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickedFamily, setPickedFamily] = useState<Family | null>(null);
  const [statuses, setStatuses] = useState<Record<string, WriteStatus>>({});
  const [phase, setPhase] = useState<WritePhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [backupId, setBackupId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [recallOpen, setRecallOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => content.write.recallChecklist.map(() => false));
  const usbMode = usb === "checking" || usb === null ? usb : usb.mode;
  const [seenUsbMode, setSeenUsbMode] = useState(usbMode);
  const [droppedFromPtp, setDroppedFromPtp] = useState(false);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
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
      return { files: planWriteFor(card.model, card.state, explicitPp(set), family) };
    } catch (e) {
      return { error: userMessage(e, content.write.planFailed) };
    }
  }, [card, set, family, blocked]);

  const files = plan && "files" in plan ? plan.files : null;
  // iOS cannot write yet (O1): canWrite stays false and the write button names the camera as not supported. A browser
  // without the card folder saves the files through WebWritePanel instead.
  const webShare = Platform.OS === "web" && !canPickCardFolder();
  const writeHere = Platform.OS === "android" || canPickCardFolder();
  const canWrite = writeHere && files !== null && (phase === "idle" || phase === "rolledBack");
  // Android reads the card only with all-files access. Until it is granted, the connect action asks for it in place of the old access gate.
  const needAccess = Platform.OS === "android" && access === false;
  const grantNow = () => {
    setAccessNotice(null);
    void grantAccess().then(setAccessNotice);
  };
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

  // Recall "Khôi phục": puts back the backup this write made, after the user confirms.
  const restoreNow = () => {
    if (!backupId) return;
    setRestoring(true);
    setMessage(null);
    void restoreCardBackup(backupId)
      .then((outcome) =>
        setMessage(
          outcome === "restored"
            ? content.write.restored
            : outcome === "noCard"
              ? content.backups.noCard
              : content.backups.restoreFailed,
        ),
      )
      .finally(() => setRestoring(false));
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

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Footer per stage (AlphaApp screens 3–5). One primary action; the writing stage has no footer.
  let actions: ReactNode = null;
  if (stage === "connect") {
    actions = needAccess ? (
      <Button label={content.home.onboarding.grant} onPress={grantNow} />
    ) : waiting ? (
      <Button label={content.write.camera.waiting} onPress={noop} disabled />
    ) : issue || webShare ? (
      <Button label={content.common.recheck} onPress={recheck} />
    ) : (
      <Button label={writeLabel} onPress={write} disabled={!canWrite} />
    );
  } else if (stage === "done") {
    actions = <Button label={content.write.titles.recall} onPress={() => setRecallOpen(true)} />;
  } else if (stage === "failed") {
    actions =
      phase === "kept" ? (
        <Button label={content.write.blocked.toHome} onPress={() => router.navigate("/")} />
      ) : (
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button label={content.write.checkCable} onPress={checkCable} variant="secondary" />
          </View>
          <View style={styles.grow}>
            <Button label={content.common.retry} onPress={write} disabled={!canWrite} />
          </View>
        </View>
      );
  } else if (stage === "recall") {
    actions = (
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button
            label={content.write.restore}
            onPress={() => setRestoreOpen(true)}
            variant="secondary"
            disabled={restoring || !backupId}
          />
        </View>
        <View style={styles.grow}>
          <Button label={content.write.preview} onPress={() => router.push("/preview")} />
        </View>
      </View>
    );
  }

  // Only ZV-E10 writes today, so the drive in the guide is the default camera until a card is read.
  const driveName = card?.model.name ?? DEFAULT_MODEL.name;
  const slotLabels = set ? set.slots.map((slot) => slot.label) : [];
  const artLabel = waiting ? "Máy ảnh ZV-E10 chưa nối cáp với điện thoại" : issue ? "Máy ảnh báo lỗi thẻ" : "Máy ảnh đã nối với điện thoại";
  const centered = stage === "writing" || stage === "done" || stage === "failed";

  return (
    <Screen center={centered} footer={actions ? <PinnedBar>{actions}</PinnedBar> : undefined}>
      <ScreenHeader title={content.write.titles[stage]} />

      {stage === "connect" ? (
        <ConnectHero state={waiting || needAccess ? "waiting" : issue ? "error" : "ok"} label={artLabel}>
          {needAccess ? (
            <Text style={[roles.body, styles.center, { color: theme.label }]}>{content.home.onboarding.text}</Text>
          ) : waiting ? (
            hint === "ptpOff" ? (
              <>
                <Text style={[roles.h3, styles.center, { color: theme.label }]}>{content.write.camera.ptpLines[0]}</Text>
                <Text style={[roles.body, styles.center, { color: theme.label }]}>{content.write.camera.ptpLines[1]}</Text>
              </>
            ) : hint === "replug" ? (
              <Text style={[roles.h3, { color: theme.label }]}>{content.write.camera.replug}</Text>
            ) : (
              <WaitingLine text={content.write.camera.waiting} />
            )
          ) : reading?.kind === "noSony" ? (
            <>
              <Text style={[roles.h3, styles.center, { color: theme.label }]}>{content.write.camera.unformatted[0]}</Text>
              <View style={[styles.path, { backgroundColor: theme.fill }]}>
                <Text style={[roles.label, { color: theme.label }]}>{content.write.camera.unformatted[1]}</Text>
              </View>
              <View style={styles.warnLine}>
                <WarnGlyph color={theme.danger} size={22} />
                <Text style={[roles.label, { color: theme.danger }]}>{content.write.camera.unformatted[2]}</Text>
              </View>
            </>
          ) : issue ? (
            <>
              <Text style={[roles.h3, styles.center, { color: theme.label }]}>{issue[0]}</Text>
              {issue.slice(1).map((line) => (
                <Text key={line} style={[roles.body, styles.center, { color: theme.secondary }]}>
                  {line}
                </Text>
              ))}
            </>
          ) : card ? (
            <>
              <Text style={[roles.h2, { color: theme.label }]}>{card.model.name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: infoOpen }}
                onPress={() => setInfoOpen((o) => !o)}
                style={({ pressed }) => [styles.detailPill, { borderColor: theme.outline }, pressed && { backgroundColor: theme.fill }]}
              >
                <Text style={[roles.labelSm, { color: theme.label }]}>{content.write.details}</Text>
                <View style={[styles.chev, { borderColor: theme.label }, infoOpen && styles.chevUp]} />
              </Pressable>
              {infoOpen ? (
                <View style={styles.info}>
                  {[
                    { l: content.write.familyLine(family).split(" ")[0], v: family },
                    { l: content.write.formatted.replace(/ Đã format$/, ""), v: "Đã format" },
                    ...(backupId ? [{ l: content.write.backupId, v: backupId }] : []),
                  ].map((row) => (
                    <View key={row.l} style={[styles.infoRow, { borderTopColor: theme.separator }]}>
                      <Text style={[roles.bodySm, { color: theme.secondary }]}>{row.l}</Text>
                      <Text style={[roles.label, { color: theme.label }]}>{row.v}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ConnectHero>
      ) : null}

      {stage === "connect" && (waiting || needAccess) ? (
        <>
          <StepCard n={1} title="Chọn Mass Storage">
            <MassStorageArt left="Kết nối USB" right="Mass Storage" />
          </StepCard>
          <StepCard n={2} title="Cắm cáp USB-C" />
          <StepCard n={3} title={`Chọn ổ ${driveName}`}>
            <DrivePickerArt drive={driveName} cancel="Huỷ" allow="Cho phép" />
            {Platform.OS === "web" ? (
              <Button
                label={canPickCardFolder() ? content.home.webGrantFolder : content.home.webGrantFiles}
                onPress={grantNow}
                variant="secondary"
              />
            ) : null}
            {accessNotice ? <Text style={[styles.danger, { color: theme.danger }]}>{accessNotice}</Text> : null}
          </StepCard>
        </>
      ) : null}

      {stage === "connect" && !waiting && !blocked && card && set ? (
        <>
          <View style={[styles.setCard, { backgroundColor: theme.card }]}>
            <Text style={[roles.title, styles.setName, { color: theme.label }]}>{set.name}</Text>
            <SlotPhotos labels={slotLabels} />
          </View>
          {choice?.ask ? (
            <View style={[styles.setCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.note, { color: theme.secondary }]}>{content.write.familyAsk}</Text>
              <Segmented<Family> options={familyOptions} value={family} onChange={chooseFamilyNow} />
            </View>
          ) : null}
          {card.view.family !== null && card.matched === null ? (
            <Text style={[styles.note, { color: theme.secondary }]}>{content.write.mismatch}</Text>
          ) : null}
          {plan && "error" in plan ? <Text style={[styles.danger, { color: theme.danger }]}>{plan.error}</Text> : null}
          {webShare && files ? <WebWritePanel files={files} family={family} setId={set.id} uuid={card.uuid} /> : null}
          {message ? <Text style={[styles.danger, { color: theme.danger }]}>{message}</Text> : null}
        </>
      ) : null}

      {stage === "writing" ? (
        <>
          <WarnPill text={content.write.doNotUnplug} />
          <ProgressRing filled={ringCount(phase, okFiles)} />
        </>
      ) : null}

      {stage === "done" ? (
        <>
          <ResultDisc ok />
          <Text style={[roles.h2, { color: theme.label }]}>{content.write.written}</Text>
          <View style={styles.doneGrid}>
            <SlotPhotos labels={slotLabels} names={false} />
          </View>
        </>
      ) : null}

      {stage === "failed" ? (
        <>
          <ResultDisc ok={false} />
          <Text style={[roles.h3, styles.center, { color: theme.label }]}>
            {phase === "kept" ? content.write.kept : content.write.keepOld}
          </Text>
          {message ? <Text style={[styles.danger, { color: theme.danger }]}>{message}</Text> : null}
        </>
      ) : null}

      {stage === "recall" ? (
        <View style={styles.recallList}>
          <RecallItem picture={<UnplugPicture />} text={content.write.recallChecklist[0]} checked={checked[0]} onToggle={() => toggleCheck(0)} />
          <RecallItem picture={<PowerPicture />} text={content.write.recallChecklist[1]} checked={checked[1]} onToggle={() => toggleCheck(1)} />
          <RecallWarning text={content.write.recallChecklist[2]} />
          <RecallItem picture={<ModePicture />} text={content.write.recallCaption} checked={checked[2]} onToggle={() => toggleCheck(2)} />
          {message ? <Text style={[styles.note, { color: theme.secondary }]}>{message}</Text> : null}
        </View>
      ) : null}

      <RestoreSheet
        visible={restoreOpen}
        title={content.write.restoreTitle}
        body={content.write.restoreBody}
        cancel="Huỷ"
        action={content.write.restore}
        onCancel={() => setRestoreOpen(false)}
        onConfirm={() => {
          setRestoreOpen(false);
          restoreNow();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...typeScale.subhead },
  danger: { ...typeScale.subhead, fontFamily: fontFamily.medium },
  center: { textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1 },
  path: { paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: radii.field },
  warnLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  detailPill: { flexDirection: "row", alignItems: "center", gap: spacing.s6, height: 48, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1 },
  chev: { width: 8, height: 8, marginTop: -4, borderRightWidth: 2.2, borderBottomWidth: 2.2, transform: [{ rotate: "45deg" }] },
  chevUp: { marginTop: 4, transform: [{ rotate: "-135deg" }] },
  info: { alignSelf: "stretch" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderTopWidth: 1 },
  setCard: { borderRadius: 24, padding: spacing.lg, gap: spacing.md },
  setName: { lineHeight: 26 },
  doneGrid: { width: "100%", maxWidth: 320 },
  recallList: { gap: spacing.md },
});
