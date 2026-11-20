// Actions of the selected set card, for the user's own sets only (SPEC §2.4.2). Edit lives in the footer ("Chỉnh slot").
// The rename field uses the fill and control radius.
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { content } from "@/content";
import { PRESET_LIMITS, type PresetSet } from "@/core/web/lib/presetSets";
import { StoreError } from "@/core/web/lib/app-core/sets/store";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { confirmDestructive } from "@/ui/confirm";
import { typeScale } from "@/ui/tokens";
import { controlHeight, radii, spacing, useTheme } from "@/ui/theme";

type Props = {
  set: PresetSet;
  onChanged: () => void;
};

const messageOf = (e: unknown) => (e instanceof StoreError ? e.message : content.sets.actionFailed);

export function SetActions({ set, onChanged }: Props) {
  const theme = useTheme();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(set.name);
  const [error, setError] = useState<string | null>(null);

  const startRename = () => {
    setDraft(set.name);
    setError(null);
    setRenaming(true);
  };

  const saveName = async () => {
    setError(null);
    try {
      await setStore.rename(set.id, draft);
    } catch (e) {
      setError(messageOf(e));
      return;
    }
    setRenaming(false);
    onChanged();
  };

  const remove = async () => {
    setError(null);
    try {
      await setStore.remove(set.id);
    } catch (e) {
      setError(messageOf(e));
      return;
    }
    onChanged();
  };

  const confirmRemove = () => {
    confirmDestructive({
      title: content.sets.removeTitle,
      message: content.sets.removeBody(set.name),
      cancel: content.sets.cancel,
      action: content.sets.remove,
      onConfirm: () => void remove(),
    });
  };

  return (
    <View style={styles.wrap}>
      {renaming ? (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            maxLength={PRESET_LIMITS.name}
            accessibilityLabel={content.sets.rename}
            style={[typeScale.body, styles.input, { backgroundColor: theme.fill, color: theme.label }]}
          />
          <Button label={content.sets.renameSave} onPress={() => void saveName()} variant="secondary" disabled={draft.trim() === ""} />
          <Button label={content.sets.cancel} onPress={() => setRenaming(false)} variant="plain" />
        </>
      ) : (
        <>
          <Button label={content.sets.rename} onPress={startRename} variant="plain" />
          <Button label={content.sets.remove} onPress={confirmRemove} variant="plain" />
        </>
      )}
      {error ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: { minHeight: controlHeight, borderRadius: radii.control, paddingHorizontal: spacing.md },
});
