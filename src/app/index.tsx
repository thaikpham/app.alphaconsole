// Preset home (SPEC §2.4.2, 9.3): pick a set, see the camera it is written to, and the card status.
import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { content } from "@/content";
import { DEFAULT_MODEL, modelById, type ModelId } from "@/core/web/lib/app-core/models";
import { defaultSet, listedSets, type PresetSet } from "@/core/web/lib/presetSets";
import { CameraSheet } from "@/home/CameraSheet";
import { CreateSetSheet } from "@/home/CreateSetSheet";
import { type HomeTab, parseHomeTab, tabSets } from "@/home/homeTabs";
import { LocalAvatar } from "@/home/LocalAvatar";
import { MoreSheet } from "@/home/MoreSheet";
import { PresetCard } from "@/home/PresetCard";
import { SetActions } from "@/home/SetActions";
import { loadCameraSelection } from "@/storage/cameraFile";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { BookmarkIcon, CameraIcon, ChevronDownIcon, PlusIcon } from "@/ui/Glyphs";
import { InstallHint } from "@/ui/InstallHint";
import { PinnedBar } from "@/ui/PinnedBar";
import { Screen } from "@/ui/Screen";
import { SegmentedTabs } from "@/ui/SegmentedTabs";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { navHeader } from "@/ui/navHeader";
import { radii, spacing, useTheme } from "@/ui/theme";
import { press, typeScale } from "@/ui/tokens";

const noop = () => undefined;

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const snack = useSnackbar();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const tab = parseHomeTab(tabParam);
  const own = tab === "mine";

  const [bundled, setBundled] = useState<PresetSet[]>([]);
  const [mine, setMine] = useState<PresetSet[]>([]);
  const [cameraId, setCameraId] = useState<ModelId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const model = (cameraId ? modelById(cameraId) : null) ?? DEFAULT_MODEL;
  const sets = tabSets(tab, bundled, mine);
  const selected = sets.find((set) => set.id === selectedId) ?? null;

  const reload = useCallback(async () => {
    setCameraId(await loadCameraSelection().catch(() => null));
    try {
      const data = await setStore.load();
      setBundled(listedSets(data.bundled));
      setMine(data.user);
      setLoadError(null);
      setLoaded(true);
    } catch {
      setLoadError(content.sets.loadFailed);
    }
  }, [setCameraId, setBundled, setMine, setLoaded, setLoadError]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const changeTab = (next: HomeTab) => {
    router.setParams({ tab: next });
  };

  const created = (set: PresetSet) => {
    setCreateOpen(false);
    setSelectedId(set.id);
    snack.show(content.presets.created(set.name));
    void reload();
  };

  const tabs: { value: HomeTab; label: string }[] = [
    { value: "recommended", label: content.presets.tabRecommended },
    { value: "kol", label: content.presets.tabKol },
    { value: "mine", label: content.presets.tabMine(mine.length) },
  ];

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
            <Button label={own && mine.length === 0 ? content.presets.noMineToWrite : content.presets.pickOne} onPress={noop} disabled />
          ) : !model.capabilities.write ? (
            <Button label={content.presets.unwritable(model.name)} onPress={noop} disabled />
          ) : (
            <Button label={content.presets.write} onPress={() => router.push({ pathname: "/write", params: { id: selected.id } })} />
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
              onPress={() => setMoreOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={content.more.title}
              style={({ pressed }) => [styles.avatarHit, pressed && styles.pressedScale]}
            >
              <LocalAvatar diameter={32} glyph={20} color={theme.secondary} />
            </Pressable>
          ),
        }}
      />
      <Screen footer={footer} scrollEdge overlay={<Snackbar state={snack.state} onDismiss={snack.hide} />}>
        {Platform.OS === "web" ? <InstallHint /> : null}

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

        <SegmentedTabs options={tabs} value={tab} onChange={changeTab} />

        {loadError ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{loadError}</Text> : null}

        {mine.length > 0 ? (
          <Pressable
            onPress={() => setCreateOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.dashed, { borderColor: theme.outline, backgroundColor: pressed ? theme.fill2 : "transparent" }]}
          >
            <PlusIcon color={theme.label} size={20} />
            <Text style={[typeScale.title, { color: theme.label }]}>{content.presets.create}</Text>
          </Pressable>
        ) : null}

        {loaded && sets.length === 0 ? (
          <Card>
            <View style={[styles.emptyIcon, { backgroundColor: theme.fill }]}>
              <BookmarkIcon color={theme.label} size={34} />
            </View>
            <Text style={[typeScale.title3, styles.center, { color: theme.label }]}>{content.presets.mineEmpty}</Text>
            {own ? <Button label={content.presets.create} onPress={() => setCreateOpen(true)} /> : null}
            {tab !== "recommended" ? (
              <Button label={content.presets.browseRecommended} onPress={() => changeTab("recommended")} variant="secondary" />
            ) : null}
          </Card>
        ) : null}

        {sets.map((set) => (
          <PresetCard
            key={set.id}
            set={set}
            byline={tab === "kol" ? set.author?.name : undefined}
            selected={selected?.id === set.id}
            onPress={() => setSelectedId(set.id)}
          >
            {own ? <SetActions set={set} onChanged={() => void reload()} /> : null}
          </PresetCard>
        ))}
      </Screen>

      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onChooseCamera={() => setCameraOpen(true)}
        onCreateSet={() => setCreateOpen(true)}
      />
      <CameraSheet visible={cameraOpen} selected={cameraId} onClose={() => setCameraOpen(false)} onChanged={setCameraId} />
      <CreateSetSheet
        visible={createOpen}
        bases={bundled}
        initialBaseId={defaultSet(bundled)?.id ?? ""}
        onClose={() => setCreateOpen(false)}
        onCreated={created}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pressedScale: { transform: [{ scale: press.button }] },
  avatarHit: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
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
  dashed: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1 },
});
