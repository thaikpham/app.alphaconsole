// All-files access gate (SPEC screen 1 reached without access). "Để sau" defers it for this session only.
import { useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";

import { useCardDriver } from "@/card/useCardDriver";
import { content } from "@/content";
import { openAllFilesAccessSettings } from "../../../modules/usb-volume";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { navHeader } from "@/ui/navHeader";
import { useTheme, spacing } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

export default function AccessGate() {
  const theme = useTheme();
  const { defer } = useCardDriver();
  const [notice, setNotice] = useState<string | null>(null);

  const grant = async () => {
    setNotice(null);
    try {
      await openAllFilesAccessSettings();
    } catch {
      setNotice(content.home.onboarding.openFailed);
    }
  };

  return (
    <Screen>
      {Platform.OS === "ios" ? <Stack.Screen options={navHeader({ title: content.home.title })} /> : null}
      {Platform.OS === "ios" ? null : (
        <Text style={[typeScale.title2, { color: theme.label }]} accessibilityRole="header">
          {content.home.title}
        </Text>
      )}
      <Card>
        <Text style={[typeScale.body, { color: theme.label }]}>{content.home.onboarding.text}</Text>
        <Button label={content.home.onboarding.grant} onPress={grant} />
        {notice ? <Text style={[typeScale.subhead, styles.notice, { color: theme.danger }]}>{notice}</Text> : null}
      </Card>
      <Button label={content.home.onboarding.later} onPress={defer} variant="plain" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: spacing.xs },
});
