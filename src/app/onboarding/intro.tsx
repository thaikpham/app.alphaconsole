// Intro (SPEC screen 0): how M1–M4 reach the camera. Reached first from the device pick, later from the overflow.
import { Platform, StyleSheet, Text, View } from "react-native";
import { Stack, useCanGoBack, useRouter } from "expo-router";

import { content } from "@/content";
import { sceneFor } from "@/home/sceneMap";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import { Button } from "@/ui/Button";
import { PinnedBar } from "@/ui/PinnedBar";
import { SceneThumb } from "@/ui/SceneThumb";
import { Screen } from "@/ui/Screen";
import { ValueRow } from "@/ui/ValueRow";
import { navHeader } from "@/ui/navHeader";
import { radii, spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

export default function Intro() {
  const router = useRouter();
  const theme = useTheme();
  const canGoBack = useCanGoBack();
  const { markSeen } = useOnboarding();

  // Finishing onboarding (CTA or skip) marks it seen, then leaves. Without a previous screen, the app opens home.
  const finish = () => {
    markSeen();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <Screen
      footer={
        <PinnedBar>
          <Button label={content.intro.cta} onPress={finish} />
        </PinnedBar>
      }
    >
      {Platform.OS === "ios" ? (
        <Stack.Screen
          options={{
            ...navHeader({ title: content.intro.title, largeTitle: true }),
            // First run only: skip sits in the header. Reopened, the system back button replaces the body back row.
            ...(canGoBack ? {} : { headerRight: () => <Button label={content.intro.skip} onPress={finish} variant="secondary" /> }),
          }}
        />
      ) : null}
      {Platform.OS === "ios" ? null : (
        <View style={canGoBack ? styles.start : styles.end}>
          {canGoBack ? (
            <Button label={content.common.back} onPress={() => router.back()} variant="plain" />
          ) : (
            <Button label={content.intro.skip} onPress={finish} variant="plain" />
          )}
        </View>
      )}

      {Platform.OS === "ios" ? null : (
        <Text style={[typeScale.title2, { color: theme.label }]} accessibilityRole="header">
          {content.intro.title}
        </Text>
      )}

      <View style={styles.grid}>
        {content.intro.slotScenes.map((scene, index) => (
          <View key={scene} style={styles.cell}>
            <SceneThumb scene={sceneFor(scene)} style={styles.thumb} />
            <Text style={[typeScale.subhead, { color: theme.label }]}>{`M${index + 1} · ${scene}`}</Text>
          </View>
        ))}
      </View>

      <View style={styles.block}>
        {content.intro.rows.map((row) => (
          <Text key={row} style={[typeScale.body, { color: theme.label }]}>
            {row}
          </Text>
        ))}
      </View>

      <View accessible accessibilityLabel={content.intro.diagramAria} style={styles.diagram}>
        {content.intro.diagram.map((cell) => (
          <View key={cell} style={[styles.diagramCell, { backgroundColor: theme.fill }]}>
            <Text style={[typeScale.subhead, { color: theme.label }]}>{cell}</Text>
          </View>
        ))}
      </View>

      <View accessible accessibilityLabel={content.intro.exampleAria}>
        <ValueRow label={content.intro.example.label} value={content.intro.example.value} />
      </View>

      <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.intro.note}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  start: { alignItems: "flex-start" },
  end: { alignItems: "flex-end" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell: { width: "47%", gap: spacing.xs },
  thumb: { width: "100%", aspectRatio: 3 / 2, borderRadius: radii.control },
  block: { gap: spacing.sm },
  diagram: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  diagramCell: { minWidth: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.badge, alignItems: "center" },
});
