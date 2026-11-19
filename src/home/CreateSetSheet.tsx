// "Bộ mới" sheet (SPEC 9.2). A copy of a base set with the user's name and slot labels, saved as a new set in "Của tôi".
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { content } from "@/content";
import type { PresetSet } from "@/core/web/lib/presetSets";
import { applyNewSet, NEW_LABEL_LIMIT, NEW_NAME_LIMIT } from "@/home/createSet";
import { setStore } from "@/storage/userSetsFile";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { typeScale } from "@/ui/tokens";
import { controlHeight, radii, spacing, useTheme } from "@/ui/theme";

type Props = {
  visible: boolean;
  /** Bundled sets the new set can be based on. */
  bases: PresetSet[];
  /** Base selected when the sheet opens. */
  initialBaseId: string;
  onClose: () => void;
  onCreated: (set: PresetSet) => void;
};

export function CreateSetSheet({ visible, bases, initialBaseId, onClose, onCreated }: Props) {
  return (
    <BottomSheet visible={visible} title={content.createSet.title} onClose={onClose}>
      <CreateSetForm bases={bases} initialBaseId={initialBaseId} onCreated={onCreated} />
    </BottomSheet>
  );
}

// BottomSheet unmounts its children while hidden, so this form starts empty on every open.
function CreateSetForm({ bases, initialBaseId, onCreated }: Omit<Props, "visible" | "onClose">) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const [name, setName] = useState("");
  const [baseId, setBaseId] = useState(initialBaseId);
  const [labels, setLabels] = useState<string[]>(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const base = bases.find((set) => set.id === baseId) ?? bases[0];
  const canSubmit = name.trim() !== "" && !busy && base !== undefined;

  const setLabel = (index: number, text: string) => {
    setLabels((prev) => prev.map((label, i) => (i === index ? text : label)));
  };

  // Duplicate the base, apply the typed name and labels, then save. If the save fails, the copy is removed again.
  const submit = async () => {
    if (!base || !canSubmit) return;
    setBusy(true);
    setFailed(false);
    let copy: PresetSet | null = null;
    try {
      copy = await setStore.duplicate(base.id);
      const created = applyNewSet(copy, name, labels);
      await setStore.save(created);
      onCreated(created);
    } catch {
      if (copy) await setStore.remove(copy.id).catch(() => undefined);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.createSet.name}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={content.createSet.namePlaceholder}
            placeholderTextColor={theme.secondary}
            maxLength={NEW_NAME_LIMIT}
            accessibilityLabel={content.createSet.name}
            style={[typeScale.body, styles.input, { backgroundColor: theme.fill, color: theme.label }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.createSet.base}</Text>
          {bases.map((set) => {
            const on = set.id === base?.id;
            return (
              <Pressable
                key={set.id}
                onPress={() => setBaseId(set.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.option, { backgroundColor: on ? theme.accentWash : theme.fill }, pressed && styles.pressed]}
              >
                <Text style={[typeScale.body, { color: theme.label }]}>{set.name}</Text>
                <Text style={[typeScale.subhead, { color: theme.secondary }]}>{set.slots.map((slot) => slot.label).join(" · ")}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.createSet.slotNames}</Text>
        {labels.map((label, i) => (
          <View key={i} style={styles.field}>
            <Text style={[typeScale.subhead, { color: theme.label }]}>{content.createSet.slotName(i + 1)}</Text>
            <TextInput
              value={label}
              onChangeText={(text) => setLabel(i, text)}
              placeholder={base?.slots[i]?.label}
              placeholderTextColor={theme.secondary}
              maxLength={NEW_LABEL_LIMIT}
              accessibilityLabel={content.createSet.slotName(i + 1)}
              style={[typeScale.body, styles.input, { backgroundColor: theme.fill, color: theme.label }]}
            />
          </View>
        ))}
      </ScrollView>

      {failed ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{content.sets.actionFailed}</Text> : null}
      <Button label={content.createSet.submit} onPress={() => void submit()} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  fields: { gap: spacing.lg },
  field: { gap: spacing.sm },
  input: { minHeight: controlHeight, borderRadius: radii.control, paddingHorizontal: spacing.md },
  option: { borderRadius: radii.control, padding: spacing.md, gap: spacing.xs },
  pressed: { opacity: 0.6 },
});
