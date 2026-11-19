import { installTextDecoderShim } from "@/core/shims/textDecoder";
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from "@expo-google-fonts/noto-sans";
import { useFonts } from "expo-font";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, StyleSheet, Text } from "react-native";

import { CardDriverProvider } from "@/card/useCardDriver";
import { installCrashLog, recordCrash } from "@/crash/install";
import { content } from "@/content";
import { OnboardingProvider } from "@/onboarding/OnboardingContext";
import { OnboardingGuard } from "@/onboarding/OnboardingGuard";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { typeScale } from "@/ui/tokens";
import { useTheme } from "@/ui/theme";
import type { IosPalette } from "@/ui/theme.ios";

// Runs before any DAT reader is called (see core/shims/textDecoder.ts).
installTextDecoderShim();

// Unhandled JS errors and promise rejections go to the crash log (src/crash/).
installCrashLog();

SplashScreen.preventAutoHideAsync();

/** Shown in place of a screen whose render threw. The error text stays on screen so a release build can be diagnosed, and it is written to the crash log. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  useEffect(() => {
    recordCrash("js", error);
  }, [error]);

  return (
    <Screen>
      <Text style={[styles.title, { color: theme.label }]}>{content.common.crashed}</Text>
      <Text selectable style={[styles.message, { color: theme.danger }]}>
        {error.message || String(error)}
      </Text>
      <Button label={content.common.retry} onPress={retry} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typeScale.title3 },
  message: { ...typeScale.subhead },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  });

  useEffect(() => {
    // A font error still hides the splash; text then falls back to the system font.
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  const theme = useTheme();
  const pageBg = Platform.OS === "ios" ? (theme as IosPalette).edge : theme.bg;

  if (!loaded && !error) return null;

  return (
    <OnboardingProvider>
      <CardDriverProvider>
        <OnboardingGuard>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pageBg } }} />
        </OnboardingGuard>
      </CardDriverProvider>
    </OnboardingProvider>
  );
}
