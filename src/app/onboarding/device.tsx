// Device pick, first onboarding screen (design v21 SPEC screen 8). The choice is saved as the camera selection.
// Writable cameras are radio rows under "Đã hỗ trợ". Cameras that cannot write yet sit under "Sắp có" and can still be picked, to preview.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { groupCameras } from "@/camera/cameraList";
import { content } from "@/content";
import { CAMERAS, modelById, type CameraModel, type ModelId } from "@/core/web/lib/app-core/models";
import { loadCameraSelection, saveCameraSelection } from "@/storage/cameraFile";
import { Button } from "@/ui/Button";
import { LockGlyph, SearchIcon } from "@/ui/Glyphs";
import { PinnedBar } from "@/ui/PinnedBar";
import { Screen } from "@/ui/Screen";
import { Snackbar, useSnackbar } from "@/ui/Snackbar";
import { CheckIcon, CrossIcon } from "@/ui/StatusIcons";
import { navHeader } from "@/ui/navHeader";
import { controlHeight, radii, spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

export default function DevicePick() {
  const router = useRouter();
  const theme = useTheme();
  const snack = useSnackbar();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ModelId | null>(null);
  const [notified, setNotified] = useState<ModelId[]>([]);
  const [failed, setFailed] = useState(false);
  const model = selected ? modelById(selected) : null;
  const groups = useMemo(() => groupCameras(CAMERAS, query), [query]);
  const empty = groups.supported.length === 0 && groups.soon.length === 0;

  useEffect(() => {
    let alive = true;
    loadCameraSelection()
      .catch(() => null)
      .then((id) => {
        if (alive && id) setSelected(id);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Saves the choice, then opens the intro. "Xem trước" pushes it so Back returns here; "Tiếp tục" replaces this screen.
  const choose = async (mode: "preview" | "continue") => {
    if (!selected) return;
    setFailed(false);
    try {
      await saveCameraSelection(selected);
    } catch {
      setFailed(true);
      return;
    }
    if (mode === "preview") router.push("/onboarding/intro");
    else router.replace("/onboarding/intro");
  };

  // Local only: src/core has no notify feature yet, so this records the choice on screen and confirms it in a toast.
  const askNotify = (cam: CameraModel) => {
    if (notified.includes(cam.id)) return;
    setNotified((list) => [...list, cam.id]);
    snack.show(content.device.notifyToast(cam.name));
  };

  const footer = (
    <PinnedBar>
      {model && model.capabilities.write ? (
        <Button label={content.device.continue(model.name)} onPress={() => void choose("continue")} />
      ) : model ? (
        <View style={styles.pair}>
          <View style={styles.half}>
            <Button label={content.device.preview} onPress={() => void choose("preview")} variant="secondary" />
          </View>
          <View style={styles.half}>
            {notified.includes(model.id) ? (
              <StatusPill label={content.device.notified} leading={<CheckIcon color={theme.secondary} size={16} />} />
            ) : (
              <Button label={content.device.notify} onPress={() => askNotify(model)} />
            )}
          </View>
        </View>
      ) : (
        <StatusPill label={content.device.pick} />
      )}
    </PinnedBar>
  );

  return (
    <Screen footer={footer} overlay={<Snackbar state={snack.state} onDismiss={snack.hide} />}>
      <Stack.Screen options={navHeader({ title: "" })} />
      <Text accessibilityRole="header" style={[typeScale.h1, styles.heading, { color: theme.label }]}>
        {content.device.title}
      </Text>

      <View style={[styles.search, { backgroundColor: theme.card }]}>
        <SearchIcon color={theme.label} size={22} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={content.device.searchPlaceholder}
          placeholderTextColor={theme.secondary}
          accessibilityLabel={content.camera.searchAria}
          autoCapitalize="none"
          autoCorrect={false}
          style={[typeScale.body, styles.input, { color: theme.label }]}
        />
        {query !== "" ? (
          <Pressable accessibilityRole="button" accessibilityLabel={content.device.searchClear} onPress={() => setQuery("")} style={styles.clear}>
            <CrossIcon color={theme.secondary} size={20} />
          </Pressable>
        ) : null}
      </View>

      {groups.supported.length > 0 ? (
        <Group title={content.camera.supported}>
          {groups.supported.map((cam) => (
            <OptionRow key={cam.id} model={cam} selected={cam.id === selected} locked={false} onPress={() => setSelected(cam.id)} />
          ))}
        </Group>
      ) : null}
      {groups.soon.length > 0 ? (
        <Group title={content.camera.soon}>
          {groups.soon.map((cam) => (
            <OptionRow key={cam.id} model={cam} selected={cam.id === selected} locked onPress={() => setSelected(cam.id)} />
          ))}
        </Group>
      ) : null}

      {model && !model.capabilities.write ? (
        <Text style={[typeScale.caption, styles.notice, { color: theme.secondary }]}>{content.device.notWritable(model.name)}</Text>
      ) : null}
      {empty ? (
        <View accessibilityLiveRegion="polite" style={styles.empty}>
          <Text style={[typeScale.h3, { color: theme.label }]}>{content.camera.empty}</Text>
        </View>
      ) : null}
      {failed ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{content.camera.saveFailed}</Text> : null}
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[typeScale.captionStrong, styles.groupTitle, { color: theme.secondary }]}>{title}</Text>
      <View accessibilityLabel={title} style={[styles.card, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );
}

function OptionRow({
  model,
  selected,
  locked,
  onPress,
}: {
  model: CameraModel;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const ink = locked ? theme.secondary : theme.label;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        locked && styles.rowLocked,
        { backgroundColor: selected ? theme.fill : pressed || hovered ? theme.press : "transparent" },
      ]}
    >
      <Radio color={ink} selected={selected} />
      <Text style={[locked ? typeScale.body : typeScale.title, styles.name, { color: ink }]}>{model.name}</Text>
      {locked ? <SoonChip /> : null}
    </Pressable>
  );
}

function Radio({ color, selected }: { color: string; selected: boolean }) {
  return (
    <View importantForAccessibility="no" style={[styles.radio, { borderColor: color }]}>
      {selected ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    </View>
  );
}

function SoonChip() {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.fill }]}>
      <LockGlyph color={theme.secondary} size={16} />
      <Text style={[typeScale.captionStrong, { color: theme.secondary }]}>{content.camera.soon}</Text>
    </View>
  );
}

/** Grey pill for footer states that cannot act yet, and for the confirmed notify request. */
function StatusPill({ label, leading }: { label: string; leading?: ReactNode }) {
  const theme = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={[styles.pill, { backgroundColor: theme.separator }]}>
      {leading}
      <Text style={[typeScale.button, { color: theme.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: spacing.xs },
  search: {
    height: 56,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: 18,
    paddingRight: spacing.xs,
  },
  input: { flex: 1, minWidth: 0, height: controlHeight, padding: 0 },
  clear: { width: controlHeight, height: controlHeight, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  group: { gap: spacing.sm },
  groupTitle: { paddingHorizontal: spacing.xs },
  card: { borderRadius: radii.card, padding: spacing.sm },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
  },
  rowLocked: { minHeight: 52 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, minWidth: 0 },
  chip: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s6,
    height: 32,
    paddingHorizontal: spacing.s10,
    borderRadius: radii.control,
  },
  notice: { marginTop: -spacing.xs, paddingHorizontal: spacing.xs },
  empty: { paddingVertical: 32, paddingHorizontal: spacing.lg, alignItems: "center" },
  pair: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  pill: {
    height: controlHeight,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
