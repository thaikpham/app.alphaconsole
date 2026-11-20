// iOS "Bộ mới" sheet (SPEC-IOS §9.2, canvas 2ca). Same props as CreateSetSheet.tsx.
// Large detent. Hủy leading, Tạo trailing (primary, disabled while the name is empty).
// A copy of a base set with the user's name and slot labels, saved as a new set in "Của tôi".
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { content } from "@/content";
import type { PresetSet } from "@/core/web/lib/presetSets";
import { applyNewSet, NEW_LABEL_LIMIT, NEW_NAME_LIMIT } from "@/home/createSet";
import { setStore } from "@/storage/userSetsFile";
import { BottomSheet, HeaderAction } from "@/ui/BottomSheet";
import { typeScale } from "@/ui/tokens";
import { controlHeight, radii, rowMinHeight, spacing, useTheme } from "@/ui/theme";

type Props = {
  visible: boolean;
  /** Bundled sets the new set can be based on. */
  bases: PresetSet[];
  /** Base selected when the sheet opens. */
  initialBaseId: string;
  onClose: () => void;
  onCreated: (set: PresetSet) => void;
};

const EMPTY_LABELS = ["", "", "", ""];

export function CreateSetSheet({ visible, bases, initialBaseId, onClose, onCreated }: Props) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [baseId, setBaseId] = useState(initialBaseId);
  const [labels, setLabels] = useState<string[]>(EMPTY_LABELS);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const base = bases.find((set) => set.id === baseId) ?? bases[0];
  const canSubmit = name.trim() !== "" && !busy && base !== undefined;

  // The sheet stays mounted between opens, so start each open from an empty form.
  // Set during render so the first frame of an open already shows the reset form.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName("");
      setBaseId(initialBaseId);
      setLabels(EMPTY_LABELS);
      setFailed(false);
    }
  }

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
    <BottomSheet
      visible={visible}
      title={content.createSet.title}
      onClose={onClose}
      detent="large"
      leading={<HeaderAction label={content.sets.cancel} onPress={onClose} />}
      trailing={<HeaderAction label={content.createSet.submit} onPress={() => void submit()} primary disabled={!canSubmit} />}
    >
      <View style={styles.form}>
        <Field label={content.createSet.name}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={content.createSet.namePlaceholder}
            placeholderTextColor={theme.secondary}
            maxLength={NEW_NAME_LIMIT}
            accessibilityLabel={content.createSet.name}
            style={[typeScale.body, styles.input, { backgroundColor: theme.fill, color: theme.label }]}
          />
        </Field>

        <Field label={content.createSet.base}>
          <View style={[styles.group, { backgroundColor: theme.cell }]}>
            {bases.map((set, i) => {
              const on = set.id === base?.id;
              return (
                <Pressable
                  key={set.id}
                  onPress={() => setBaseId(set.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [
                    styles.option,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text style={[typeScale.body, { color: theme.label }]}>{set.name}</Text>
                    <Text style={[typeScale.subhead, { color: theme.secondary }]}>
                      {set.slots.map((slot) => slot.label).join(" · ")}
                    </Text>
                  </View>
                  {on ? <Text style={[typeScale.headline, { color: theme.accent }]}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={content.createSet.slotNames}>
          {labels.map((label, i) => (
            <Field key={i} label={content.createSet.slotName(i + 1)}>
              <TextInput
                value={label}
                onChangeText={(text) => setLabel(i, text)}
                placeholder={base?.slots[i]?.label}
                placeholderTextColor={theme.secondary}
                maxLength={NEW_LABEL_LIMIT}
                accessibilityLabel={content.createSet.slotName(i + 1)}
                style={[typeScale.body, styles.input, { backgroundColor: theme.fill, color: theme.label }]}
              />
            </Field>
          ))}
        </Field>

        {failed ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{content.sets.actionFailed}</Text> : null}
      </View>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[typeScale.fieldLabel, { color: theme.secondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  field: { gap: spacing.sm },
  input: { height: controlHeight, borderRadius: radii.control, paddingHorizontal: spacing.lg },
  group: { borderRadius: radii.card, overflow: "hidden" },
  option: {
    minHeight: rowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  optionText: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.6 },
});
