// Device pick, first screen of onboarding (SPEC screen 8). The choice is saved as the camera selection.
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { content } from "@/content";
import { modelById, type ModelId } from "@/core/models";
import { loadCameraSelection, saveCameraSelection } from "@/storage/cameraFile";
import { Button } from "@/ui/Button";
import { CameraList } from "@/ui/CameraList";
import { PinnedBar } from "@/ui/PinnedBar";
import { Screen } from "@/ui/Screen";
import { navHeader } from "@/ui/navHeader";
import { spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

export default function DevicePick() {
  const router = useRouter();
  const theme = useTheme();
  const [selected, setSelected] = useState<ModelId | null>(null);
  const [failed, setFailed] = useState(false);
  const model = selected ? modelById(selected) : null;

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

  return (
    <Screen
      footer={
        <PinnedBar>
          {model ? (
            <Button label={content.device.continue(model.name)} onPress={() => void choose("continue")} />
          ) : (
            <Button label={content.device.pick} onPress={() => undefined} disabled />
          )}
        </PinnedBar>
      }
    >
      {Platform.OS === "ios" ? <Stack.Screen options={navHeader({ title: content.device.title, largeTitle: true })} /> : null}
      {Platform.OS === "ios" ? null : (
        <Text style={[typeScale.title2, { color: theme.label }]} accessibilityRole="header">
          {content.device.title}
        </Text>
      )}
      <CameraList selected={selected} onSelect={setSelected} searchPlaceholder={content.device.searchPlaceholder} />

      {model && !model.capabilities.write ? (
        <View style={styles.block}>
          <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.device.notWritable(model.name)}</Text>
          <Button label={content.device.preview} onPress={() => void choose("preview")} variant="secondary" />
        </View>
      ) : null}
      {failed ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{content.camera.saveFailed}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
});
