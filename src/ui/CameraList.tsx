// iOS camera list (SPEC-IOS §9.3, O14, O16). Same props as CameraList.tsx.
// Locked cameras are disabled here. The base list keeps them pressable (O14 deviation, flagged).
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { groupCameras } from "@/camera/cameraList";
import { content } from "@/content";
import { CAMERAS, type CameraModel, type ModelId } from "@/core/web/lib/app-core/models";
import { radii, rowMinHeight, spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

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
        clearButtonMode="while-editing"
        style={[typeScale.body, styles.search, { backgroundColor: theme.fill, color: theme.label }]}
      />
      <View accessibilityLabel={content.camera.listAria} style={styles.list}>
        {groups.supported.length > 0 ? (
          <Section title={content.camera.supported} models={groups.supported} selected={selected} onSelect={onSelect} locked={false} />
        ) : null}
        {groups.soon.length > 0 ? (
          <Section title={content.camera.soon} models={groups.soon} selected={selected} onSelect={onSelect} locked />
        ) : null}
        {empty ? <Text style={[typeScale.body, styles.empty, { color: theme.secondary }]}>{content.camera.empty}</Text> : null}
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
      <Text style={[typeScale.footnote, styles.sectionTitle, { color: theme.secondary }]}>{title}</Text>
      <View style={[styles.cell, { backgroundColor: theme.cell }]}>
        {models.map((model, i) => (
          <CameraRow
            key={model.id}
            model={model}
            selected={model.id === selected}
            locked={locked}
            first={i === 0}
            onPress={() => onSelect(model.id)}
          />
        ))}
      </View>
    </View>
  );
}

type CameraRowProps = {
  model: CameraModel;
  selected: boolean;
  locked: boolean;
  first: boolean;
  onPress: () => void;
};

function CameraRow({ model, selected, locked, first, onPress }: CameraRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
        { backgroundColor: pressed && !locked ? theme.press : theme.cell },
      ]}
    >
      {locked ? <LockIcon color={theme.accent} /> : null}
      <View style={styles.rowText}>
        <Text style={[typeScale.body, { color: locked ? theme.secondary : theme.label }]}>{model.name}</Text>
        <Text style={[typeScale.subhead, { color: theme.secondary }]}>{model.sonyModel}</Text>
      </View>
      {selected ? <Text style={[typeScale.headline, { color: theme.accent }]}>✓</Text> : null}
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
  search: { height: 44, borderRadius: radii.pill, paddingHorizontal: spacing.lg },
  list: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.lg },
  cell: { borderRadius: radii.card, overflow: "hidden" },
  row: {
    minHeight: rowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: spacing.xs },
  empty: { textAlign: "center", paddingVertical: spacing.xl },
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
