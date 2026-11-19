// Camera list with search, shared by the device pick (onboarding) and the camera sheet (SPEC 9.3, D8).
// Every camera is selectable; the ones without write support sit under "Sắp có" with a lock.
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { groupCameras } from "@/camera/cameraList";
import { content } from "@/content";
import { CAMERAS, type CameraModel, type ModelId } from "@/core/models";
import { controlHeight, radii, spacing, useTheme } from "@/ui/theme";
import { fonts, typeScale } from "@/ui/tokens";

type CameraListProps = {
  selected: ModelId | null;
  onSelect: (id: ModelId) => void;
  searchPlaceholder: string;
};

export function CameraList({ selected, onSelect, searchPlaceholder }: CameraListProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupCameras(CAMERAS, query), [query]);
  const empty = groups.supported.length === 0 && groups.soon.length === 0;

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        placeholderTextColor={theme.secondary}
        accessibilityLabel={content.camera.searchAria}
        autoCapitalize="none"
        autoCorrect={false}
        style={[typeScale.body, styles.search, { backgroundColor: theme.fill, color: theme.label }]}
      />
      <View accessibilityLabel={content.camera.listAria} style={styles.list}>
        {groups.supported.length > 0 ? (
          <Section title={content.camera.supported} models={groups.supported} selected={selected} onSelect={onSelect} locked={false} />
        ) : null}
        {groups.soon.length > 0 ? (
          <Section title={content.camera.soon} models={groups.soon} selected={selected} onSelect={onSelect} locked />
        ) : null}
        {empty ? <Text style={[typeScale.body, { color: theme.secondary }]}>{content.camera.empty}</Text> : null}
      </View>
    </View>
  );
}

type SectionProps = {
  title: string;
  models: CameraModel[];
  selected: ModelId | null;
  onSelect: (id: ModelId) => void;
  locked: boolean;
};

function Section({ title, models, selected, onSelect, locked }: SectionProps) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[typeScale.subhead, styles.sectionTitle, { color: theme.secondary }]}>{title}</Text>
      {models.map((model) => (
        <CameraRow
          key={model.id}
          model={model}
          selected={model.id === selected}
          locked={locked}
          onPress={() => onSelect(model.id)}
        />
      ))}
    </View>
  );
}

type CameraRowProps = {
  model: CameraModel;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
};

function CameraRow({ model, selected, locked, onPress }: CameraRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: selected ? theme.accentWash : theme.card, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {locked ? <LockIcon color={theme.secondary} /> : null}
      <View style={styles.rowText}>
        <Text style={[typeScale.body, { color: theme.label }]}>{model.name}</Text>
        <Text style={[typeScale.subhead, { color: theme.secondary }]}>{model.sonyModel}</Text>
      </View>
      {selected ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
    </Pressable>
  );
}

/** Padlock drawn with Views (no icon library in the app). */
function LockIcon({ color }: { color: string }) {
  return (
    <View style={styles.lock} importantForAccessibility="no" accessibilityElementsHidden>
      <View style={[styles.shackle, { borderColor: color }]} />
      <View style={[styles.lockBody, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  search: {
    minHeight: controlHeight,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
  },
  list: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fonts.semibold },
  row: {
    minHeight: controlHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.control,
  },
  rowText: { flex: 1, gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lock: { width: 14, height: 16, alignItems: "center", justifyContent: "flex-end" },
  shackle: {
    width: 10,
    height: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  lockBody: { width: 14, height: 9, borderRadius: 2 },
});
