import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { appVersion } from "@/crash/appInfo";
import { content, recallWarning } from "@/content";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { colors, radii, spacing, typeScale } from "@/ui/tokens";

type GuideSection = { title: string; lines: readonly string[]; showRecallWarning?: boolean };

const sections: readonly GuideSection[] = content.guide.sections;

export default function Guide() {
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title={content.guide.title} />

      {sections.map((section) => (
        <Fragment key={section.title}>
          <Card>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.lines.map((line, i) => (
              <Text key={line} style={styles.line}>
                {`${i + 1}. ${line}`}
              </Text>
            ))}
          </Card>
          {section.showRecallWarning ? (
            <View style={styles.warning}>
              <Text style={styles.stepTitle}>{recallWarning.title}</Text>
              <Text style={styles.note}>{recallWarning.text}</Text>
            </View>
          ) : null}
        </Fragment>
      ))}

      <Text style={styles.note}>{content.guide.logsHint}</Text>
      <Button label={content.guide.logsLink} onPress={() => router.push("/logs")} variant="plain" />
      <Text style={styles.note}>{`${content.common.version} ${appVersion()}`}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typeScale.title3, color: colors.label },
  line: { ...typeScale.body, color: colors.label },
  note: { ...typeScale.footnote, color: colors.secondary },
  stepTitle: { ...typeScale.subhead, fontWeight: "600", color: colors.label },
  warning: { backgroundColor: colors.warningTint, borderRadius: radii.control, padding: spacing.md, gap: spacing.xs },
});
