// Actions of the selected set card (SPEC 5.1). Edit for every set; rename and remove only for the user's own sets.
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { content } from "@/content";
import { PRESET_LIMITS, type PresetSet } from "@/core/web/lib/presetSets";
import { StoreError } from "@/core/sets/store";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { typeScale } from "@/ui/tokens";
import { controlHeight, radii, spacing, useTheme } from "@/ui/theme";

type Props = {
  set: PresetSet;
  own: boolean;
  onChanged: () => void;
};

const messageOf = (e: unknown) => (e instanceof StoreError ? e.message : content.sets.actionFailed);

export function SetActions({ set, own, onChanged }: Props) {
  const router = useRouter();
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
    Alert.alert(content.sets.removeTitle, content.sets.removeBody(set.name), [
      { text: content.sets.cancel, style: "cancel" },
      { text: content.sets.remove, style: "destructive", onPress: () => void remove() },
    ]);
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
          <Button label={content.presets.edit} onPress={() => router.push({ pathname: "/sets/[id]/edit", params: { id: set.id } })} variant="secondary" />
          {own ? (
            <>
              <Button label={content.sets.rename} onPress={startRename} variant="plain" />
              <Button label={content.sets.remove} onPress={confirmRemove} variant="plain" />
            </>
          ) : null}
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
