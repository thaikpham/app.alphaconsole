import { useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text } from "react-native";
import { usePreventRemove } from "expo-router";

import { formatCrashEntry } from "@/crash/entry";
import { clearCrashes, deleteCrash, listCrashEntries, type StoredCrash } from "@/crash/store";
import { content } from "@/content";
import { Button } from "@/ui/Button";
import { downloadFile } from "@/ui/download";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, press, spacing, typeScale } from "@/ui/tokens";
import { fontFamily } from "@/ui/v21";

/** Local time for a list row. Shows the stored text when it is not a date. */
function rowTime(time: string): string {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? time : date.toLocaleString();
}

export default function Logs() {
  const [crashes, setCrashes] = useState<StoredCrash[]>(() => listCrashEntries());
  const [selected, setSelected] = useState<StoredCrash | null>(null);

  // With a crash open, back returns to the list instead of leaving the screen.
  usePreventRemove(selected !== null, () => setSelected(null));

  function reload() {
    setCrashes(listCrashEntries());
    setSelected(null);
  }

  function share(crash: StoredCrash) {
    const text = formatCrashEntry(crash.entry);
    if (Platform.OS !== "web") {
      void Share.share({ message: text }).catch(() => undefined);
      return;
    }
    // The web has no share sheet here, so the entry is saved as a file.
    downloadFile(crash.name, new TextEncoder().encode(text), "application/json");
  }

  function remove(crash: StoredCrash) {
    deleteCrash(crash.name);
    reload();
  }

  function clearAll() {
    clearCrashes();
    reload();
  }

  return (
    <Screen scrollEdge>
      <ScreenHeader title={content.logs.title} />

      {selected ? (
        <>
          <Card>
            <Text selectable style={styles.detail}>
              {formatCrashEntry(selected.entry)}
            </Text>
          </Card>
          <Button label={content.logs.share} onPress={() => share(selected)} />
          <Button label={content.logs.delete} variant="secondary" onPress={() => remove(selected)} />
        </>
      ) : (
        <>
          <Text style={styles.note}>{content.logs.intro}</Text>
          <Card>
            {crashes.length === 0 ? <Text style={styles.note}>{content.logs.empty}</Text> : null}
            {crashes.map((crash) => (
              <Pressable
                key={crash.name}
                accessibilityRole="button"
                onPress={() => setSelected(crash)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.rowTime}>{rowTime(crash.entry.time)}</Text>
                <Text numberOfLines={2} style={styles.rowMessage}>
                  {crash.entry.message}
                </Text>
              </Pressable>
            ))}
          </Card>
          {crashes.length > 0 ? <Button label={content.logs.clearAll} variant="plain" onPress={clearAll} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...typeScale.footnote, color: colors.secondary },
  detail: { ...typeScale.footnote, fontFamily: fontFamily.regular, color: colors.label },
  row: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator },
  pressed: { transform: [{ scale: press.card }] },
  rowTime: { ...typeScale.footnote, fontFamily: fontFamily.medium, color: colors.secondary },
  rowMessage: { ...typeScale.subhead, color: colors.label },
});
