// Intro (design v21 SPEC screen 0): how M1–M4 reach the camera. Reached first from the device pick, later from the overflow.
import { StyleSheet, Text, View } from "react-native";
import { Stack, useCanGoBack, useRouter } from "expo-router";

import { content } from "@/content";
import { sceneLook } from "@/home/sceneMap";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import { Button } from "@/ui/Button";
import { ArrowDownIcon } from "@/ui/Glyphs";
import { PinnedBar } from "@/ui/PinnedBar";
import { SceneThumb } from "@/ui/SceneThumb";
import { Screen } from "@/ui/Screen";
import { navHeader } from "@/ui/navHeader";
import { radii, spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

// The camera LCD in the sample is a fixed picture, so it keeps these colours in light and dark.
const LCD = "#0b0d12";
const LCD_CHIP = "#c2410c";
const LCD_KEY_ON = "rgba(255,255,255,0.55)";
const LCD_KEY_OFF = "rgba(255,255,255,0.3)";
const LCD_INK_OFF = "rgba(255,255,255,0.75)";

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

  // MODE is left off the sample panel, as in the design: it shows MR and keys 1–4 only.
  const [, mode, ...keys] = content.intro.diagram;
  // The console shows the app as it is, so the web build keeps the app's wording.
  const rows = content.intro.rows;

  return (
    <Screen
      footer={
        <PinnedBar>
          <Button label={content.intro.cta} onPress={finish} />
        </PinnedBar>
      }
    >
      <Stack.Screen
        options={{
          ...navHeader({ title: "" }),
          // First run only: skip sits in the header. Reopened, the system back button replaces the body back row.
          ...(canGoBack ? {} : { headerRight: () => <Button label={content.intro.skip} onPress={finish} variant="plain" /> }),
        }}
      />
      <Text accessibilityRole="header" style={[typeScale.h1, styles.heading, { color: theme.label }]}>
        {content.intro.title}
      </Text>

      <View style={[styles.card, styles.sample, { backgroundColor: theme.card }]}>
        <View style={styles.grid}>
          {content.intro.slotScenes.map((scene, index) => (
            <View key={scene} style={styles.cell}>
              <SceneThumb scene={sceneLook(scene).image} filter={sceneLook(scene).filter} scale={sceneLook(scene).scale} scrim style={styles.thumb} />
              <Text style={[typeScale.captionStrong, styles.mLabel]}>{`M${index + 1}`}</Text>
            </View>
          ))}
        </View>
        <View style={styles.arrow}>
          <ArrowDownIcon color={theme.accent} size={24} />
        </View>
        <View accessible accessibilityLabel={content.intro.diagramAria} style={styles.lcd}>
          <View style={styles.chip}>
            <Text style={[typeScale.title, { color: "#ffffff" }]}>{mode}</Text>
          </View>
          {keys.map((key, i) => (
            <View key={key} style={[styles.key, { borderColor: i === 0 ? LCD_KEY_ON : LCD_KEY_OFF }]}>
              <Text style={[typeScale.title, { color: i === 0 ? "#ffffff" : LCD_INK_OFF }]}>{key}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {rows.map((row, i) => (
          <View key={row} style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: theme.separator }]}>
            <View style={[styles.stepNo, { backgroundColor: theme.fill }]}>
              <Text style={[typeScale.title, { color: theme.label }]}>{i + 1}</Text>
            </View>
            <Text style={[typeScale.body, styles.grow, { color: theme.label }]}>{row}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.example, { backgroundColor: theme.card }]}>
        <View accessible accessibilityLabel={content.intro.exampleAria} style={[styles.exampleRow, { backgroundColor: theme.fill }]}>
          <Text style={[typeScale.body, styles.grow, { color: theme.label }]}>{content.intro.example.label}</Text>
          <Text style={[typeScale.body, { color: theme.secondary }]}>{content.intro.example.value}</Text>
        </View>
        <Text style={[typeScale.body, styles.note, { color: theme.label }]}>{content.intro.note}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: spacing.xs },
  card: { borderRadius: radii.card, overflow: "hidden" },
  sample: { padding: spacing.lg, gap: spacing.md },
  grid: { flexDirection: "row", gap: spacing.sm },
  cell: { flex: 1 },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: radii.field },
  mLabel: {
    position: "absolute",
    left: 7,
    bottom: 5,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  arrow: { alignItems: "center" },
  lcd: {
    height: 68,
    borderRadius: radii.field,
    backgroundColor: LCD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radii.control, backgroundColor: LCD_CHIP },
  key: { width: 38, height: 38, borderRadius: radii.control, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  step: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  stepNo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  example: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  exampleRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.field,
  },
  note: { paddingHorizontal: spacing.sm },
  grow: { flex: 1, minWidth: 0 },
});
