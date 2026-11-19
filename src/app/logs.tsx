import { useState } from "react";
import { Pressable, Share, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { formatCrashEntry } from "@/crash/entry";
import { clearCrashes, deleteCrash, listCrashEntries, type StoredCrash } from "@/crash/store";
import { content } from "@/content";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, fonts, spacing, typeScale } from "@/ui/tokens";

/** Local time for a list row. Shows the stored text when it is not a date. */
function rowTime(time: string): string {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? time : date.toLocaleString();
}

export default function Logs() {
  const router = useRouter();
  const [crashes, setCrashes] = useState<StoredCrash[]>(() => listCrashEntries());
  const [selected, setSelected] = useState<StoredCrash | null>(null);

  function reload() {
    setCrashes(listCrashEntries());
    setSelected(null);
  }

  function share(crash: StoredCrash) {
    void Share.share({ message: formatCrashEntry(crash.entry) }).catch(() => undefined);
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
    <Screen>
      <ScreenHeader title={content.logs.title} onBack={() => (selected ? setSelected(null) : router.back())} />

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
  detail: { ...typeScale.footnote, fontFamily: fonts.regular, color: colors.label },
  row: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator },
  pressed: { opacity: 0.85 },
  rowTime: { ...typeScale.footnote, fontFamily: fonts.medium, color: colors.secondary },
  rowMessage: { ...typeScale.subhead, color: colors.label },
});
