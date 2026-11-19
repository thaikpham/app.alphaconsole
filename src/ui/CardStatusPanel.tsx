// Card status on the preset home (D9 card block). Reads the shared session from useCardDriver; the slot details
// stay collapsed until the user opens them. Logic moved unchanged from the old home screen.
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { cardReader, userMessage, type ReadyCard } from "@/card/session";
import type { CardLine } from "@/card/status";
import { useCardDriver } from "@/card/useCardDriver";
import { content } from "@/content";
import type { ReadOnlySlot } from "@/core/card/readOnly";
import type { SlotView } from "@/core/card/view";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { StatusChip, type ChipTone } from "@/ui/StatusChip";
import { ValueRow } from "@/ui/ValueRow";
import { useTheme, spacing } from "@/ui/theme";
import { fonts, typeScale } from "@/ui/tokens";

function statusChip(line: CardLine): { label: string; tone: ChipTone } {
  switch (line.kind) {
    case "checking":
      return { label: content.home.usbState.checking, tone: "neutral" };
    case "unplugged":
      return { label: content.home.usbState.none, tone: "neutral" };
    case "ptp":
      return { label: content.home.usbState.ptp, tone: "warning" };
    case "unknownMode":
      return { label: content.home.usbState.unknown, tone: "warning" };
    case "reading":
      return { label: content.home.reading, tone: "neutral" };
    case "mounting":
      return { label: content.home.mounting, tone: "neutral" };
    case "absent":
      return { label: content.home.absent, tone: "neutral" };
    case "unformatted":
      return { label: content.home.noSony, tone: "warning" };
    case "noSlots":
      return { label: content.home.noSlots, tone: "neutral" };
    case "broken":
      return { label: line.message, tone: "danger" };
    case "ready":
      return {
        label: `${content.home.model} · ${content.home.usbState.massStorage} · ${content.home.family[line.family]} · ${content.home.current}${line.currentName ?? content.home.otherSet}`,
        tone: line.currentName ? "success" : "neutral",
      };
    case "readOnly":
      return { label: content.home.readOnly(line.name), tone: "neutral" };
    case "unsupported":
      return { label: content.home.unsupported(line.name), tone: "neutral" };
  }
}

function slotChip(slot: SlotView): { label: string; tone: ChipTone } {
  const name = slot.label ?? (slot.readable ? content.home.empty : content.home.slot.unreadable);
  return { label: `M${slot.slot} · ${name}`, tone: slot.readable ? "neutral" : "warning" };
}

function SlotBlock({ slot }: { slot: SlotView }) {
  const theme = useTheme();
  return (
    <View style={[styles.slot, { borderTopColor: theme.separator }]}>
      <Text style={[typeScale.subhead, styles.slotTitle, { color: theme.label }]}>{`M${slot.slot}`}</Text>
      {slot.readable ? (
        <>
          <ValueRow label={content.home.slot.mode} value={slot.mode ?? content.home.empty} />
          <ValueRow label={content.home.slot.wb} value={slot.wb ?? content.home.empty} />
          <ValueRow label={content.home.slot.pp} value={slot.ppOn ? content.home.slot.on : content.home.slot.off} />
          <ValueRow label={content.home.slot.focus} value={slot.focus ?? content.home.empty} />
          <ValueRow label={content.home.slot.label} value={slot.label ?? content.home.empty} />
        </>
      ) : (
        <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.home.slot.unreadable}</Text>
      )}
    </View>
  );
}

/** Slot chips when the card has slots but no matching set, and the slot details when the user opens them. */
function CardDetails({ card, showDetails }: { card: ReadyCard; showDetails: boolean }) {
  const { view, matched } = card;
  return (
    <View style={styles.details}>
      {view.family !== null && !matched ? (
        <View style={styles.chips}>
          {view.slots.map((slot) => {
            const chip = slotChip(slot);
            return <StatusChip key={slot.slot} label={chip.label} tone={chip.tone} />;
          })}
        </View>
      ) : null}
      {showDetails ? view.slots.map((slot) => <SlotBlock key={slot.slot} slot={slot} />) : null}
    </View>
  );
}

function ReadOnlySlotBlock({ slot }: { slot: ReadOnlySlot }) {
  const theme = useTheme();
  return (
    <View style={[styles.slot, { borderTopColor: theme.separator }]}>
      <Text style={[typeScale.subhead, styles.slotTitle, { color: theme.label }]}>{`M${slot.slot}`}</Text>
      {slot.rows ? (
        slot.rows.map((row) => <ValueRow key={row.settingId} label={row.settingId} value={row.valueLabel} />)
      ) : (
        <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.home.slot.unreadable}</Text>
      )}
    </View>
  );
}

/** Settings of a read-only camera: the slots when the card has the camera's folder, else a note. */
function ReadOnlyDetails({ folder, slots, showDetails }: { folder: boolean; slots: ReadOnlySlot[]; showDetails: boolean }) {
  const theme = useTheme();
  if (!folder) return <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.home.noSettingFolder}</Text>;
  return (
    <View style={styles.details}>
      {showDetails ? slots.map((slot) => <ReadOnlySlotBlock key={slot.slot} slot={slot} />) : null}
    </View>
  );
}

export function CardStatusPanel() {
  const router = useRouter();
  const theme = useTheme();
  const { reading, failure, status } = useCardDriver();
  const [showDetails, setShowDetails] = useState(false);
  const [ignoredOverwrite, setIgnoredOverwrite] = useState<string | null>(null);

  // The single read path: every focus re-reads, so a write finished on another screen shows here.
  useFocusEffect(
    useCallback(() => {
      void cardReader.request("focus");
    }, []),
  );

  const line = statusChip(status);
  const notice = failure ? userMessage(failure.error, content.home.readFailed) : null;
  const ready = reading?.kind === "ready" ? reading.card : null;
  const readOnly = reading?.kind === "readOnly" ? reading : null;
  const lastWritten = ready?.lastWritten ?? null;
  const overwriteKey = ready && ready.overwritten.length > 0 ? `${ready.uuid}:${ready.overwritten.join(",")}` : null;
  const toggle = (
    <Button
      label={showDetails ? content.home.details.hide : content.home.details.show}
      onPress={() => setShowDetails((v) => !v)}
      variant="plain"
    />
  );

  return (
    <Card>
      <Text style={[typeScale.title3, { color: theme.label }]}>{content.home.cameraTitle}</Text>
      <StatusChip label={line.label} tone={line.tone} />
      {notice ? <Text style={[typeScale.subhead, styles.strong, { color: theme.danger }]}>{notice}</Text> : null}

      {ready ? (
        <>
          <CardDetails card={ready} showDetails={showDetails} />
          {lastWritten && overwriteKey && overwriteKey !== ignoredOverwrite ? (
            <View style={styles.block}>
              <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.home.overwritten(ready.overwritten)}</Text>
              <Button
                label={content.home.rewriteSet}
                onPress={() => router.push({ pathname: "/write", params: { id: lastWritten.setId } })}
                variant="secondary"
              />
              <Button label={content.home.ignore} onPress={() => setIgnoredOverwrite(overwriteKey)} variant="plain" />
            </View>
          ) : null}
          {ready.recovery ? (
            <Text
              style={[
                typeScale.subhead,
                {
                  color:
                    ready.recovery.kind === "restoreFailed" || ready.recovery.kind === "noBackup"
                      ? theme.danger
                      : theme.secondary,
                },
              ]}
            >
              {content.home.recovery[ready.recovery.kind]}
            </Text>
          ) : null}
          {ready.view.slots.length > 0 ? toggle : null}
        </>
      ) : null}

      {readOnly ? (
        <>
          <ReadOnlyDetails folder={readOnly.folder} slots={readOnly.slots} showDetails={showDetails} />
          {readOnly.folder ? toggle : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: fonts.medium },
  details: { gap: spacing.md },
  block: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1 },
  slotTitle: { fontFamily: fonts.semibold },
});
