// Preset home (SPEC §2.4.2, 9.3): pick a recommended set, see the camera it is written to, and write or edit it.
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { content } from "@/content";
import { DEFAULT_MODEL, modelById, type ModelId } from "@/core/web/lib/app-core/models";
import { listedSets, type PresetSet } from "@/core/web/lib/presetSets";
import { CameraSheet } from "@/home/CameraSheet";
import { editedCopies } from "@/home/editedSets";
import { recommendedSets } from "@/home/homeTabs";
import { SettingsSheet } from "@/home/SettingsSheet";
import { PresetCard } from "@/home/PresetCard";
import { loadCameraSelection } from "@/storage/cameraFile";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { CameraIcon, ChevronDownIcon, GearIcon } from "@/ui/Glyphs";
import { PinnedBar } from "@/ui/PinnedBar";
import { Screen } from "@/ui/Screen";
import { navHeader } from "@/ui/navHeader";
import { radii, spacing, useTheme } from "@/ui/theme";
import { press, typeScale } from "@/ui/tokens";

const noop = () => undefined;

export default function Home() {
  const router = useRouter();
  const theme = useTheme();

  const [bundled, setBundled] = useState<PresetSet[]>([]);
  const [cameraId, setCameraId] = useState<ModelId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Map<string, string>>(new Map());
  const [userSets, setUserSets] = useState<PresetSet[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const model = (cameraId ? modelById(cameraId) : null) ?? DEFAULT_MODEL;
  // A set edited through Chỉnh slot shows its edited slots under its own name and id.
  const sets = recommendedSets(bundled).map((set) => {
    const copy = userSets.find((u) => u.id === edited.get(set.id));
    return copy ? { ...copy, id: set.id, name: set.name } : set;
  });
  // The design opens with the first set picked (AlphaApp S.preset), so Ghi bộ này is ready at once.
  const selected = sets.find((set) => set.id === selectedId) ?? sets[0] ?? null;

  const reload = useCallback(async () => {
    setCameraId(await loadCameraSelection().catch(() => null));
    try {
      const data = await setStore.load();
      setBundled(listedSets(data.bundled));
      setUserSets(data.user);
      setEdited(await editedCopies().catch(() => new Map<string, string>()));
      setLoadError(null);
    } catch {
      setLoadError(content.sets.loadFailed);
    }
  }, [setCameraId, setBundled, setUserSets, setEdited, setLoadError]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Footer (SPEC §2.4.2): with a set picked, Chỉnh slot and Ghi bộ này share the row. An unwritable camera greys the write slot.
  const footer = (
    <PinnedBar>
      <View style={styles.actions}>
        {selected ? (
          <View style={styles.grow}>
            <Button
              label={content.presets.edit}
              onPress={() => router.push({ pathname: "/sets/[id]/edit", params: { id: selected.id } })}
              variant="secondary"
            />
          </View>
        ) : null}
        <View style={styles.grow}>
          {!selected ? (
            <Button label={content.presets.pickOne} onPress={noop} disabled />
          ) : !model.capabilities.write ? (
            <Button label={content.presets.unwritable(model.name)} onPress={noop} disabled />
          ) : (
            <Button label={content.presets.write} onPress={() => router.push({ pathname: "/write", params: { id: edited.get(selected.id) ?? selected.id } })} />
          )}
        </View>
      </View>
    </PinnedBar>
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...navHeader({ title: content.presets.title, largeTitle: true }),
          headerRight: () => (
            <Pressable
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={content.settings.title}
              style={({ pressed }) => [styles.settingsHit, pressed && styles.pressedScale]}
            >
              <GearIcon color={theme.secondary} size={24} />
            </Pressable>
          ),
        }}
      />
      <Screen footer={footer} scrollEdge>
        <Pressable
          onPress={() => setCameraOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${content.presets.cameraRow}, ${model.name}`}
          style={({ pressed }) => [styles.camera, { borderColor: theme.outline, backgroundColor: pressed ? theme.fill2 : "transparent" }]}
        >
          <CameraIcon color={theme.label} size={24} />
          <Text style={[typeScale.body, styles.cameraLabel, { color: theme.secondary }]}>{content.presets.cameraRow}</Text>
          <Text style={[typeScale.title, { color: theme.label }]}>{model.name}</Text>
          <ChevronDownIcon color={theme.label} size={24} />
        </Pressable>

        {loadError ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{loadError}</Text> : null}

        {sets.map((set) => (
          <PresetCard key={set.id} set={set} selected={selected?.id === set.id} onPress={() => setSelectedId(set.id)} />
        ))}
      </Screen>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} onChooseCamera={() => setCameraOpen(true)} />
      <CameraSheet visible={cameraOpen} selected={cameraId} onClose={() => setCameraOpen(false)} onChanged={setCameraId} />
    </>
  );
}

const styles = StyleSheet.create({
  pressedScale: { transform: [{ scale: press.button }] },
  settingsHit: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  camera: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.s10,
    borderRadius: radii.field,
    borderWidth: 1,
  },
  cameraLabel: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1 },
});
