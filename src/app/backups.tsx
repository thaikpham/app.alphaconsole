import { useCallback, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { useCardDriver } from "@/card/useCardDriver";
import { restoreCardBackup } from "@/card/restore";
import { canPickCardFolder } from "@/card/webAccess";
import { content } from "@/content";
import { describeCard, toCardState, type CardView } from "@/core/web/lib/app-core/card/view";
import { listedSets } from "@/core/web/lib/presetSets";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { confirmDestructive } from "@/ui/confirm";
import { Loading } from "@/ui/Loading";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, spacing, typeScale } from "@/ui/tokens";
import { listBackups, readBackup, type BackupInfo } from "../../modules/usb-volume";
import { fontFamily } from "@/ui/v21";

type Row = { info: BackupInfo; view: CardView | null };

const pad = (n: number) => String(n).padStart(2, "0");

/** dd/MM/yyyy HH:mm in local time. */
function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slotLine(slot: CardView["slots"][number]): string {
  if (!slot.readable) return `M${slot.slot} · ${content.home.slot.unreadable}`;
  return [
    `M${slot.slot}`,
    slot.label ?? content.home.empty,
    slot.mode ?? content.home.empty,
    slot.wb ?? content.home.empty,
    `PP ${slot.ppOn ? content.home.slot.on : content.home.slot.off}`,
    slot.focus ?? content.home.empty,
  ].join(" · ");
}

export default function Backups() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [cardMissing, setCardMissing] = useState(false);
  const { grantAccess } = useCardDriver();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [infos, { bundled, user }] = await Promise.all([listBackups(), setStore.load()]);
      const listed = listedSets([...bundled, ...user]);
      const newest = [...infos].sort((a, b) => b.createdAt - a.createdAt);
      const next = await Promise.all(
        newest.map(async (info): Promise<Row> => {
          try {
            const backup = await readBackup(info.id);
            const state = toCardState({ sonyCard: true, settingDir: true, files: backup.files });
            return { info, view: describeCard(state, listed) };
          } catch {
            return { info, view: null };
          }
        }),
      );
      setRows(next);
    } catch {
      setLoadError(content.backups.loadFailed);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const restore = async (id: string) => {
    setRestoring(true);
    setNotice(null);
    setCardMissing(false);
    const outcome = await restoreCardBackup(id);
    if (outcome === "noCard") {
      setNotice(content.backups.noCard);
      setCardMissing(true);
    } else {
      setNotice(outcome === "restored" ? content.backups.restored : content.backups.restoreFailed);
    }
    setRestoring(false);
  };

  // Web: folder access is asked for on this tap, after a restore finds no card.
  const grant = () => {
    void grantAccess().then(setNotice);
  };

  const confirmRestore = (info: BackupInfo) => {
    confirmDestructive({
      title: content.backups.restoreTitle,
      message: content.backups.restoreBody(formatDate(info.createdAt)),
      cancel: content.sets.cancel,
      action: content.backups.restore,
      onConfirm: () => void restore(info.id),
    });
  };

  return (
    <Screen scrollEdge>
      <ScreenHeader title={content.backups.title} />

      {loadError ? <Text style={styles.danger}>{loadError}</Text> : null}
      {notice ? <Text style={styles.danger}>{notice}</Text> : null}
      {cardMissing && Platform.OS === "web" ? (
        <Button
          label={canPickCardFolder() ? content.home.webGrantFolder : content.home.webGrantFiles}
          onPress={grant}
          variant="secondary"
        />
      ) : null}
      {rows === null && !loadError ? <Loading label={content.backups.loading} /> : null}
      {restoring ? <Loading label={content.backups.restoring} /> : null}

      {rows && rows.length === 0 ? <Text style={styles.note}>{content.backups.empty}</Text> : null}

      {rows && rows.length > 0 ? (
        <Card>
          {rows.map(({ info, view }, i) => (
            <View key={info.id} style={[styles.row, i > 0 && styles.separated]}>
              <Text style={styles.cardTitle}>{formatDate(info.createdAt)}</Text>
              <Text style={styles.note}>{content.backups.files(info.files)}</Text>
              {view === null ? <Text style={styles.danger}>{content.backups.unreadable}</Text> : null}
              {view?.error ? <Text style={styles.danger}>{view.error}</Text> : null}
              {view && !view.error && view.slots.length === 0 ? <Text style={styles.note}>{content.home.noSlots}</Text> : null}
              {view?.slots.map((slot) => (
                <Text key={slot.slot} style={styles.line}>
                  {slotLine(slot)}
                </Text>
              ))}
              <Button
                label={content.backups.restore}
                onPress={() => confirmRestore(info)}
                variant="secondary"
                disabled={restoring}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typeScale.title3, color: colors.label },
  note: { ...typeScale.footnote, color: colors.secondary },
  danger: { ...typeScale.footnote, fontFamily: fontFamily.medium, color: colors.danger },
  line: { ...typeScale.footnote, color: colors.label, paddingTop: spacing.xs },
  row: { gap: spacing.md },
  separated: { borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: spacing.md },
});
