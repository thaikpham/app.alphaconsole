import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from "expo-router";

import { content } from "@/content";
import { canonical, changedStages, clearPp, setSetting, validateEdited } from "@/core/web/lib/app-core/sets/draft";
import { FIXED_DISPLAY } from "@/core/sets/fixedDisplay";
import { popHistory, pushHistory } from "@/core/web/lib/app-core/sets/history";
import {
  DEFAULT_KELVIN,
  PP_BANKS,
  ROW_FIELD,
  STAGE_ROWS,
  applyToAll,
  formatShift,
  isBankModified,
  isRowModified,
  isSlotModified,
  ppOptions,
  readPp,
  readRow,
  resetSlot,
  rowOptions,
  rowVisible,
  writePp,
  writeRow,
  type RowId,
} from "@/core/web/lib/app-core/sets/rows";
import { nextPosition, positionOfStage, prevPosition, type StagePosition } from "@/core/web/lib/app-core/sets/stageNav";
import { StoreError } from "@/core/web/lib/app-core/sets/store";
import { PRESET_LIMITS, type PresetSet, type PresetSlot, type SlotDraft } from "@/core/web/lib/presetSets";
import { PP_FIELDS } from "@/core/web/lib/zve10/dat";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { confirmDestructive } from "@/ui/confirm";
import { Glass } from "@/ui/Glass";
import { Loading } from "@/ui/Loading";
import { navHeader } from "@/ui/navHeader";
import { Screen } from "@/ui/Screen";
import { SettingRow } from "@/ui/SettingRow";
import { SlotChips, type SlotItem } from "@/ui/SlotChips";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { StageStepper } from "@/ui/StageStepper";
import { Toggle } from "@/ui/Toggle";
import { ValuePicker } from "@/ui/ValuePicker";
import { ValueRow } from "@/ui/ValueRow";
import { controlHeight, radii, spacing, useTheme } from "@/ui/theme";
import { durations, press, typeScale } from "@/ui/tokens";
import { useKeyboardVisible } from "@/ui/useKeyboardVisible";
import { useReduceMotion } from "@/ui/useReduceMotion";

const LAST_SLOT = 3;
const LAST_STAGE = 3;
/** Stage index of Màu & da. It also holds the Picture Profile switch and the PP block. */
const COLOR_STAGE = 2;
/** Stage index of Hiển thị. It also holds the fixed camera settings block, read-only. */
const DISPLAY_STAGE = 3;
/** Rows the codec stores inside wb. They cannot be held (Như máy). */
const UNHELDABLE: ReadonlySet<RowId> = new Set<RowId>(["kelvin", "ab", "gm"]);
/** Range rows. The Stepper edits them; the other rows use the wheel or segments. */
const NUMERIC_ROWS: ReadonlySet<RowId> = new Set<RowId>(["kelvin", "ab", "gm"]);
/** iOS header toolbar capsule (canvas v13): 36 pt tall. The hit slop brings the touch area to 48, which covers 44 pt (iOS) and 48 dp (Android). */
const TOOLBAR_HEIGHT = 36;
const TOOLBAR_HIT_SLOP = { top: 6, bottom: 6 };
/** Height animation for the iOS disclosure. Reduce Motion skips it at the call site. */
const DISCLOSURE_ANIMATION = {
  duration: durations.medium,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

const FIELD_LABEL: Record<RowId, string> = {
  mode: content.field.mode,
  aperture: content.field.aperture,
  shutter: content.field.shutter,
  iso: content.field.iso,
  metering: content.field.metering,
  expCompSet: content.field.expCompSet,
  flashMode: content.field.flashMode,
  steadyShot: content.field.steadyShot,
  eFrontCurtain: content.field.eFrontCurtain,
  focus: content.field.focus,
  focusArea: content.field.focusArea,
  facePriority: content.field.facePriority,
  preAF: content.field.preAF,
  wb: content.field.wb,
  kelvin: content.field.wbKelvin,
  ab: content.field.wbAb,
  gm: content.field.wbGm,
  awbPriority: content.field.awbPriority,
  softSkin: content.field.softSkin,
  autoReview: content.field.autoReview,
  liveView: content.field.liveView,
};

type PpField = (typeof PP_FIELDS)[number];
type Status =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "failed"; message: string }
  | { kind: "bundled"; set: PresetSet }
  | { kind: "user" };

/** Row sheet to open. The sheet is built when a row is tapped, from the slot shown at that moment. */
type Picker = {
  title: string;
  options: readonly string[];
  labelOf: (value: string) => string;
  current: string | undefined;
  autoable?: boolean;
  canHold: boolean;
  stepper?: boolean;
  onCommit: (value: string | undefined) => void;
  onApplyAll?: (value: string) => void;
};

function messageOf(e: unknown, fallback: string): string {
  return e instanceof StoreError ? e.message : fallback;
}

function mapSlot(set: PresetSet, index: number, fn: (slot: PresetSlot) => PresetSlot): PresetSet {
  return { ...set, slots: set.slots.map((s, i) => (i === index ? fn(s) : s)) as PresetSet["slots"] };
}

function settingsOf(set: PresetSet): SlotDraft[] {
  return set.slots.map((s) => s.settings);
}

/** Copy of a set with the given settings in each slot. Labels are kept. */
function withSettings(set: PresetSet, settings: readonly SlotDraft[]): PresetSet {
  return { ...set, slots: set.slots.map((s, i) => ({ ...s, settings: settings[i] })) as PresetSet["slots"] };
}

function slotName(index: number): string {
  return `M${index + 1}`;
}

/** Option label from content.labels; the raw value when the group has no label (aperture, shutter, ISO, PP enums). */
function labelFor(group: string, value: string): string {
  const labels = content.labels as Record<string, Record<string, string> | undefined>;
  return labels[group]?.[value] ?? value;
}

/** Label of one option in the row sheet. */
function optionLabel(id: RowId, value: string): string {
  if (id === "wb") return labelFor("wbMode", value);
  if (id === "kelvin") return `${value}K`;
  if (id === "ab" || id === "gm") return formatShift(id, Number(value));
  return labelFor(ROW_FIELD[id], value);
}

/** Value shown on a row: Như máy when held, Tự động for ISO Auto. */
function valueText(id: RowId, settings: SlotDraft): string {
  const value = readRow(settings, id);
  if (value === undefined) return content.edit.held;
  if (value === "auto") return content.edit.auto;
  return optionLabel(id, value);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.secondary }]}>{label}</Text>
      {children}
    </View>
  );
}

/** Collapsed group under a stage. Each stage mounts its own, so every stage starts collapsed. */
function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [open, setOpen] = useState(false);
  const toggle = () => {
    if (!reduce) LayoutAnimation.configureNext(DISCLOSURE_ANIMATION);
    setOpen((o) => !o);
  };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
      >
        <Text style={[styles.disclosureLabel, { color: theme.label }]}>{label}</Text>
        <Text style={[styles.disclosureMark, { color: theme.secondary }]}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** iOS header toolbar (canvas v13): Hoàn tác | Xong as one glass capsule. */
function EditToolbar({ blocked, onUndo, onDone }: { blocked: boolean; onUndo: () => void; onDone: () => void }) {
  const theme = useTheme();
  return (
    <Glass style={styles.capsule}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={content.edit.undo}
        hitSlop={TOOLBAR_HIT_SLOP}
        onPress={onUndo}
        style={({ pressed }) => [styles.capsuleButton, pressed && styles.pressedScale]}
      >
        <Text style={[styles.capsuleText, { color: theme.label }]}>{content.edit.undo}</Text>
      </Pressable>
      <View style={[styles.capsuleDivider, { backgroundColor: theme.separator }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={content.common.done}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        hitSlop={TOOLBAR_HIT_SLOP}
        onPress={onDone}
        style={({ pressed }) => [styles.capsuleButton, pressed && !blocked && styles.pressedScale]}
      >
        <Text style={[styles.capsuleText, { color: blocked ? theme.disabled : theme.accentText }]}>
          {content.common.done}
        </Text>
      </Pressable>
    </Glass>
  );
}

/** Fixed camera settings of Hiển thị. Read-only: they are not slot rows and never reach the DAT. */
function FixedDisplay() {
  const theme = useTheme();
  return (
    <View style={styles.fixed}>
      <Text style={[styles.subhead, { color: theme.label }]}>{content.fixedDisplay.title}</Text>
      <Text style={[styles.note, { color: theme.secondary }]}>{content.fixedDisplay.note}</Text>
      {FIXED_DISPLAY.map((item, i) => {
        const text = content.fixedDisplay.rows[item.id];
        return (
          <View
            key={item.id}
            style={[styles.fixedRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}
          >
            <ValueRow label={text.label} value={content.fixedDisplay.values[item.value]} />
            <Text style={[styles.path, { color: theme.secondary }]}>{text.path}</Text>
          </View>
        );
      })}
    </View>
  );
}

type StageBodyProps = {
  stage: number;
  base: SlotDraft;
  current: SlotDraft;
  ppBank: number;
  onRow: (id: RowId) => void;
  onPp: (field: PpField) => void;
  onPpOn: (value: boolean | undefined) => void;
  onPpBank: (bank: number) => void;
};

/** Rows of one stage. Màu & da also holds the Picture Profile switch and the PP bank selector. */
function StageBody({ stage, base, current, ppBank, onRow, onPp, onPpOn, onPpBank }: StageBodyProps) {
  const theme = useTheme();
  const { main, advanced } = STAGE_ROWS[stage];
  const rows = (ids: readonly RowId[]) =>
    ids
      .filter((id) => rowVisible(current, id))
      .map((id, i) => (
        <SettingRow
          key={id}
          label={FIELD_LABEL[id]}
          value={valueText(id, current)}
          modified={isRowModified(base, current, id)}
          divider={i > 0}
          onPress={() => onRow(id)}
        />
      ));
  const ppItems: SlotItem[] = PP_BANKS.map((bank) => ({
    id: String(bank),
    label: content.edit.ppBank(bank),
    modified: isBankModified(base, current, bank),
  }));
  const ppOn = current.ppOn;
  return (
    <>
      {rows(main)}
      {stage === COLOR_STAGE ? (
        <>
          <Toggle
            label={content.field.ppOn}
            value={ppOn === true}
            onChange={(on) => onPpOn(on)}
            detail={ppOn === undefined ? content.edit.held : undefined}
            modified={canonical(base.ppOn) !== canonical(ppOn)}
          />
          {ppOn !== undefined ? (
            <Button label={content.edit.held} variant="plain" onPress={() => onPpOn(undefined)} />
          ) : null}
          <Text style={[styles.subhead, { color: theme.label }]}>{content.edit.ppTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SlotChips slots={ppItems} value={String(ppBank)} onChange={(id) => onPpBank(Number(id))} />
          </ScrollView>
          <Disclosure label={content.edit.advanced}>
            {PP_FIELDS.map((field, i) => (
              <SettingRow
                key={field.key}
                label={field.label}
                value={readPp(current, ppBank, field.key) ?? content.edit.held}
                modified={readPp(base, ppBank, field.key) !== readPp(current, ppBank, field.key)}
                divider={i > 0}
                onPress={() => onPp(field)}
              />
            ))}
          </Disclosure>
        </>
      ) : null}
      {advanced.length > 0 ? <Disclosure label={content.edit.advanced}>{rows(advanced)}</Disclosure> : null}
      {stage === DISPLAY_STAGE ? <FixedDisplay /> : null}
    </>
  );
}

export default function EditSlot() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [saved, setSaved] = useState<PresetSet | null>(null);
  const [draft, setDraft] = useState<PresetSet | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [ppBank, setPpBank] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  // Settings of all four slots before each undoable step. Labels are not in the history.
  const historyRef = useRef<SlotDraft[][]>([]);
  const snack = useSnackbar();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const keyboardVisible = useKeyboardVisible();

  // Loads once per id. Not on focus, so edits in progress survive a trip to the write screen.
  useEffect(() => {
    let active = true;
    setStore
      .load()
      .then(({ bundled, user }) => {
        if (!active) return;
        const mine = user.find((s) => s.id === id) ?? null;
        const shipped = bundled.find((s) => s.id === id);
        setSaved(mine);
        setDraft(mine);
        setNotice(null);
        historyRef.current = [];
        setStatus(mine ? { kind: "user" } : shipped ? { kind: "bundled", set: shipped } : { kind: "missing" });
      })
      .catch((e: unknown) => {
        if (active) setStatus({ kind: "failed", message: messageOf(e, content.edit.loadFailed) });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const result = useMemo(() => (draft ? validateEdited(draft) : null), [draft]);
  const error = result && "error" in result ? result.error : null;
  const blocked = error !== null;
  const ppSlot = error && error.path === "ppOn" ? error.slot : null;
  const dirty =
    saved !== null &&
    draft !== null &&
    draft.slots.some((s, i) => s.label !== saved.slots[i].label || isSlotModified(saved.slots[i].settings, s.settings));
  const last = slotIndex === LAST_SLOT && stage === LAST_STAGE;

  const releaseRef = useRef<() => void>(() => {});
  const disablePrevention = usePreventRemove(dirty, ({ repeat }) => {
    confirmDestructive({
      title: content.edit.unsavedTitle,
      message: content.edit.unsavedBody,
      cancel: content.edit.stay,
      action: content.edit.discard,
      onConfirm: () => {
        releaseRef.current();
        repeat();
      },
    });
  });
  useEffect(() => {
    releaseRef.current = disablePrevention;
  }, [disablePrevention]);

  const slot = draft?.slots[slotIndex];
  const baseSettings = saved?.slots[slotIndex].settings;
  const slotModified = slot !== undefined && baseSettings !== undefined && isSlotModified(baseSettings, slot.settings);
  const marks =
    draft && saved ? changedStages(saved.slots[slotIndex].settings, draft.slots[slotIndex].settings) : undefined;
  const slotItems: (SlotItem & { name: string })[] =
    draft && saved
      ? draft.slots.map((s, i) => ({
          id: String(i),
          label: slotName(i),
          name: s.label,
          modified: isSlotModified(saved.slots[i].settings, s.settings),
        }))
      : [];

  const setLabel = (label: string) => setDraft((d) => (d ? mapSlot(d, slotIndex, (s) => ({ ...s, label })) : d));

  const save = async (): Promise<boolean> => {
    if (!result || !("set" in result)) return false;
    try {
      await setStore.save(result.set);
      setSaved(result.set);
      setDraft(result.set);
      setNotice(content.edit.saved);
      return true;
    } catch (e) {
      setNotice(messageOf(e, content.edit.saveFailed));
      return false;
    }
  };

  const writeCard = async () => {
    if (await save()) router.push({ pathname: "/write", params: { id } });
  };

  /** iOS Xong: save, release the unsaved-changes guard, then leave. The guard would otherwise catch the back. */
  const done = async () => {
    if (!(await save())) return;
    releaseRef.current();
    router.back();
  };

  /** Stage tabs and the footer land here: clears the notice and returns the scroll to the top of the stage. */
  const goTo = (pos: StagePosition) => {
    setNotice(null);
    setSlotIndex(pos.slot);
    setStage(pos.stage);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const goPrev = () => goTo(prevPosition({ slot: slotIndex, stage }));
  const next = () => goTo(nextPosition({ slot: slotIndex, stage }, LAST_SLOT, LAST_STAGE));
  const selectStage = (index: number) => goTo(positionOfStage({ slot: slotIndex, stage }, index, LAST_STAGE));

  const copyToEdit = async (shipped: PresetSet) => {
    try {
      const copy = await setStore.duplicate(shipped.id);
      router.replace({ pathname: "/sets/[id]/edit", params: { id: copy.id } });
    } catch (e) {
      setNotice(messageOf(e, content.sets.actionFailed));
    }
  };

  /** Restores the last snapshot. The follow-up toast is deferred: the bar hides itself after onPress. */
  const undo = () => {
    const popped = popHistory(historyRef.current);
    if (!popped) return;
    historyRef.current = popped.stack;
    setDraft((d) => (d ? withSettings(d, popped.snapshot) : d));
    setTimeout(() => snack.show(content.edit.undone), 0);
  };

  /** One undoable step over all four slots. Skipped when nothing changes. */
  const commit = (settings: SlotDraft[], message?: string) => {
    if (!draft) return;
    const before = settingsOf(draft);
    if (settings.every((s, i) => canonical(s) === canonical(before[i]))) return;
    historyRef.current = pushHistory(historyRef.current, before);
    setDraft(withSettings(draft, settings));
    setNotice(null);
    if (message) snack.show(message, { label: content.edit.undo, onPress: undo });
  };

  const setRow = (id: RowId, value: string | undefined) => {
    if (!draft) return;
    const settings = settingsOf(draft).map((s, i) => (i === slotIndex ? writeRow(s, id, value) : s));
    commit(settings, content.edit.toastSet(FIELD_LABEL[id], slotName(slotIndex)));
  };

  const applyAll = (id: RowId, value: string) => {
    if (!draft) return;
    commit(applyToAll(settingsOf(draft), id, value), content.edit.toastApply(FIELD_LABEL[id]));
  };

  const setPpField = (field: PpField, value: string | undefined) => {
    if (!draft) return;
    const settings = settingsOf(draft).map((s, i) => (i === slotIndex ? writePp(s, ppBank, field.key, value) : s));
    commit(settings, content.edit.toastSet(field.label, slotName(slotIndex)));
  };

  const setPpOn = (value: boolean | undefined) => {
    if (!draft) return;
    const settings = settingsOf(draft).map((s, i) => (i === slotIndex ? setSetting(s, "ppOn", value) : s));
    commit(settings, content.edit.toastSet(content.field.ppOn, slotName(slotIndex)));
  };

  const resetCurrent = () => {
    if (!draft || !saved) return;
    commit(resetSlot(settingsOf(draft), settingsOf(saved), slotIndex), content.edit.toastReset(slotName(slotIndex)));
  };

  const clearPpAt = (slotNo: number) => {
    if (!draft) return;
    commit(settingsOf(draft).map((s, i) => (i === slotNo - 1 ? clearPp(s) : s)));
  };

  const openRow = (id: RowId) => {
    if (!slot) return;
    setPicker({
      title: FIELD_LABEL[id],
      options: rowOptions(id),
      labelOf: (value) => optionLabel(id, value),
      current: readRow(slot.settings, id) ?? (id === "kelvin" ? String(DEFAULT_KELVIN) : undefined),
      autoable: id === "iso",
      canHold: !UNHELDABLE.has(id),
      stepper: NUMERIC_ROWS.has(id),
      onCommit: (value) => setRow(id, value),
      onApplyAll: (value) => applyAll(id, value),
    });
  };

  const openPp = (field: PpField) => {
    if (!slot) return;
    setPicker({
      title: field.label,
      options: ppOptions(field),
      labelOf: (value) => value,
      current: readPp(slot.settings, ppBank, field.key),
      canHold: true,
      stepper: field.kind === "int",
      onCommit: (value) => setPpField(field, value),
    });
  };

  const nextButton = last ? (
    <Button label={content.edit.writeCard} onPress={() => void writeCard()} disabled={blocked} />
  ) : (
    <Button label={stage < LAST_STAGE ? content.edit.nextLabels[stage] : content.edit.next} onPress={next} />
  );

  // Pinned below the scroll area. Hidden while the keyboard is up: under edge-to-edge on Android the
  // window does not resize, so the bar would sit under the keyboard.
  const footer =
    status.kind === "user" && draft ? (
      <View style={[styles.bar, { backgroundColor: theme.bg, borderTopColor: theme.separator }]}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.danger, { color: theme.danger }]}>
              {error.slot ? `M${error.slot} · ${error.message}` : error.message}
            </Text>
            {ppSlot !== null ? (
              <Button label={content.edit.clearPp} variant="secondary" onPress={() => clearPpAt(ppSlot)} />
            ) : null}
          </View>
        ) : null}
        {notice ? <Text style={[styles.note, { color: theme.secondary }]}>{notice}</Text> : null}
        <View style={styles.actions}>
          <View style={styles.half}>
            <Button label={content.edit.previous} variant="secondary" onPress={goPrev} disabled={stage === 0} />
          </View>
          <View style={styles.half}>{nextButton}</View>
        </View>
      </View>
    ) : null;

  return (
    <Screen
      footer={keyboardVisible ? null : footer}
      scrollRef={scrollRef}
      scrollEdge
      overlay={<Snackbar state={snack.state} onDismiss={snack.hide} />}
    >
      <Stack.Screen
        options={{
          ...navHeader({ title: content.edit.title }),
          headerRight:
            status.kind === "user" && draft ? () => <EditToolbar blocked={blocked} onUndo={undo} onDone={() => void done()} /> : undefined,
        }}
      />
      {status.kind === "loading" ? <Loading label={content.edit.loading} /> : null}
      {status.kind === "missing" ? <Text style={[styles.note, { color: theme.secondary }]}>{content.edit.notFound}</Text> : null}
      {status.kind === "failed" ? <Text style={[styles.danger, { color: theme.danger }]}>{status.message}</Text> : null}
      {status.kind === "bundled" ? (
        <Card>
          <Text style={[styles.cardTitle, { color: theme.label }]}>{status.set.name}</Text>
          <Text style={[styles.note, { color: theme.secondary }]}>{content.edit.readOnly}</Text>
          <Button label={content.edit.copyToEdit} onPress={() => void copyToEdit(status.set)} />
        </Card>
      ) : null}
      {status.kind === "user" && draft && saved && slot && baseSettings ? (
        <>
          <Text style={[styles.setName, { color: theme.label }]}>{draft.name}</Text>
          <SlotChips slots={slotItems} value={String(slotIndex)} onChange={(v) => setSlotIndex(Number(v))} />
          <Field label={content.edit.slotLabel}>
            <TextInput
              value={slot.label}
              onChangeText={setLabel}
              maxLength={PRESET_LIMITS.slotLabel}
              style={[styles.input, { color: theme.label, backgroundColor: theme.bg, borderColor: theme.separator }]}
              accessibilityLabel={content.edit.slotLabel}
            />
          </Field>
          <StageStepper stages={content.stages} current={stage} marked={marks} onSelect={selectStage} />
          <Card>
            <Text style={[styles.cardTitle, { color: theme.label }]}>{content.stages[stage]}</Text>
            <StageBody
              key={stage}
              stage={stage}
              base={baseSettings}
              current={slot.settings}
              ppBank={ppBank}
              onRow={openRow}
              onPp={openPp}
              onPpOn={setPpOn}
              onPpBank={setPpBank}
            />
            {slotModified ? (
              <Button label={content.edit.resetSlot(slotName(slotIndex))} variant="plain" onPress={resetCurrent} />
            ) : null}
          </Card>
          {picker ? <ValuePicker {...picker} onClose={() => setPicker(null)} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typeScale.title3 },
  setName: { ...typeScale.callout, fontWeight: "600" },
  subhead: { ...typeScale.subhead, fontWeight: "600" },
  label: { ...typeScale.subhead, fontWeight: "500" },
  note: { ...typeScale.subhead },
  danger: { ...typeScale.subhead, fontWeight: "500" },
  field: { gap: spacing.xs },
  input: {
    ...typeScale.callout,
    height: controlHeight,
    borderRadius: radii.control,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  disclosure: {
    minHeight: controlHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disclosureLabel: { ...typeScale.callout, fontWeight: "600" },
  disclosureMark: { ...typeScale.callout },
  pressed: { opacity: 0.85 },
  bar: { gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1 },
  actions: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  errorBox: { gap: spacing.sm },
  capsule: { height: TOOLBAR_HEIGHT, flexDirection: "row", alignItems: "center", borderRadius: radii.pill },
  capsuleButton: {
    height: TOOLBAR_HEIGHT,
    minWidth: 48,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleDivider: { width: 1, height: 20 },
  capsuleText: { ...typeScale.subhead, fontWeight: "600" },
  pressedScale: { transform: [{ scale: press.button }] },
  fixed: { gap: spacing.sm },
  fixedRow: { gap: spacing.xs },
  path: { ...typeScale.footnote },
});
