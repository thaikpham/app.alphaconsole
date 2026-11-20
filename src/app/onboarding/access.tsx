// All-files access gate (SPEC screen 1 reached without access). "Để sau" defers it for this session only.
import { useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";

import { useCardDriver } from "@/card/useCardDriver";
import { canPickCardFolder } from "@/card/webAccess";
import { content } from "@/content";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { navHeader } from "@/ui/navHeader";
import { useTheme, spacing } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

export default function AccessGate() {
  const theme = useTheme();
  const { defer, grantAccess } = useCardDriver();
  const [notice, setNotice] = useState<string | null>(null);

  const grant = () => {
    setNotice(null);
    void grantAccess().then(setNotice);
  };

  const body =
    Platform.OS !== "web"
      ? content.home.onboarding.text
      : canPickCardFolder()
        ? content.home.onboarding.webText
        : content.home.onboarding.webFilesText;

  return (
    <Screen>
      <Stack.Screen options={navHeader({ title: content.home.title })} />
      <Card>
        <Text style={[typeScale.body, { color: theme.label }]}>{body}</Text>
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
