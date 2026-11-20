// Preset home (SPEC 5.1, 9.3): pick a set, see the camera it is written to, and the card status.
import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { content } from "@/content";
import { DEFAULT_MODEL, modelById, type ModelId } from "@/core/web/lib/app-core/models";
import { defaultSet, listedSets, type PresetSet } from "@/core/web/lib/presetSets";
import { CameraSheet } from "@/home/CameraSheet";
import { CreateSetSheet } from "@/home/CreateSetSheet";
import { type HomeTab, parseHomeTab, tabSets } from "@/home/homeTabs";
import { MoreSheet } from "@/home/MoreSheet";
import { PresetCard } from "@/home/PresetCard";
import { SetActions } from "@/home/SetActions";
import { loadCameraSelection } from "@/storage/cameraFile";
import { setStore } from "@/storage/userSetsFile";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Glass } from "@/ui/Glass";
import { InstallHint } from "@/ui/InstallHint";
import { PinnedBar } from "@/ui/PinnedBar";
import { Screen } from "@/ui/Screen";
import { SegmentedTabs } from "@/ui/SegmentedTabs";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { ValueRow } from "@/ui/ValueRow";
import { navHeader } from "@/ui/navHeader";
import { useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

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
    } catch {
      setLoadError(content.sets.loadFailed);
    }
  }, [setCameraId, setBundled, setMine, setLoadError]);

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
    { value: "mine", label: content.presets.tabMine(mine.length) },
  ];

  // The bar carries the create action too (SPEC-IOS §4.4). Hidden in the empty Của tôi state, which offers it in the card.
  // An unwritable camera takes precedence over the selection state.
  const footer = (
    <PinnedBar>
      {!(own && mine.length === 0) ? (
        <Button label={content.presets.create} onPress={() => setCreateOpen(true)} variant="secondary" />
      ) : null}
      {!model.capabilities.write ? (
        <Button label={content.presets.unwritable(model.name)} onPress={noop} disabled />
      ) : selected ? (
        <Button label={content.presets.write} onPress={() => router.push({ pathname: "/write", params: { id: selected.id } })} />
      ) : (
        <Button label={own && mine.length === 0 ? content.presets.noMineToWrite : content.presets.pickOne} onPress={noop} disabled />
      )}
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
              hitSlop={8}
              style={({ pressed }) => (pressed ? styles.pressedScale : undefined)}
            >
              <Glass interactive style={styles.avatar}>
                <View style={[styles.head, { backgroundColor: theme.label }]} />
                <View style={[styles.shoulders, { backgroundColor: theme.label }]} />
              </Glass>
            </Pressable>
          ),
        }}
      />
      <Screen footer={footer} overlay={<Snackbar state={snack.state} onDismiss={snack.hide} />}>
        {Platform.OS === "web" ? <InstallHint /> : null}

        <Pressable onPress={() => setCameraOpen(true)} accessibilityRole="button" style={({ pressed }) => (pressed ? styles.pressedScale : undefined)}>
          <Card>
            <ValueRow label={content.presets.cameraRow} value={model.name} />
          </Card>
        </Pressable>

        <SegmentedTabs options={tabs} value={tab} onChange={changeTab} />

        {loadError ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{loadError}</Text> : null}

        {own && mine.length === 0 ? (
          <Card>
            <Text style={[typeScale.title3, { color: theme.label }]}>{content.presets.mineEmpty}</Text>
            <Button label={content.presets.create} onPress={() => setCreateOpen(true)} variant="secondary" />
            <Button label={content.presets.browseRecommended} onPress={() => changeTab("recommended")} variant="plain" />
          </Card>
        ) : null}

        {sets.map((set) => (
          <PresetCard
            key={set.id}
            set={set}
            byline={own ? content.presets.byMe : set.author?.name}
            selected={selected?.id === set.id}
            onPress={() => setSelectedId(set.id)}
          >
            <SetActions set={set} own={own} onChanged={() => void reload()} />
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
  pressedScale: { transform: [{ scale: 0.96 }] },
  // Person glyph for the signed-out avatar (drawn with Views; no icon library).
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 2 },
  head: { width: 12, height: 12, borderRadius: 6 },
  shoulders: { width: 20, height: 9, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
});
