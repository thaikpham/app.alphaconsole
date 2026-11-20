import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { appVersion } from "@/crash/appInfo";
import { content, recallWarning } from "@/content";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { radii, spacing, typeScale } from "@/ui/tokens";
import { useTheme, type Palette } from "@/ui/theme";
import { fontFamily } from "@/ui/v21";

type GuideSection = { title: string; lines: readonly string[]; showRecallWarning?: boolean };

const sections: readonly GuideSection[] = content.guide.sections;

export default function Guide() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen scrollEdge>
      <ScreenHeader title={content.guide.title} />

      <Card>
        {sections.map((section, s) => (
          <View key={section.title} style={[styles.section, s > 0 && styles.separated]}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.lines.map((line, i) => (
              <Text key={line} style={styles.line}>
                {`${i + 1}. ${line}`}
              </Text>
            ))}
            {section.showRecallWarning ? (
              <View style={styles.warning}>
                <Text style={styles.stepTitle}>{recallWarning.title}</Text>
                <Text style={styles.note}>{recallWarning.text}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </Card>

      <Text style={styles.note}>{content.guide.logsHint}</Text>
      <Button label={content.guide.logsLink} onPress={() => router.push("/logs")} variant="plain" />
      <Text style={styles.note}>{`${content.common.version} ${appVersion()}`}</Text>
    </Screen>
  );
}

function makeStyles(theme: Palette) {
  return StyleSheet.create({
    section: { gap: spacing.md },
    separated: { borderTopWidth: 1, borderTopColor: theme.separator, paddingTop: spacing.md },
    cardTitle: { ...typeScale.title3, color: theme.label },
    line: { ...typeScale.body, color: theme.label },
    note: { ...typeScale.footnote, color: theme.secondary },
    stepTitle: { ...typeScale.subhead, fontFamily: fontFamily.semibold, color: theme.label },
    warning: { backgroundColor: theme.warningTint, borderRadius: radii.control, padding: spacing.md, gap: spacing.xs },
  });
}
