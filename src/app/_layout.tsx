import { installTextDecoderShim } from "@/core/web/lib/app-core/shims/textDecoder";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Platform, StyleSheet, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from "@expo-google-fonts/noto-sans";

import { CardDriverProvider } from "@/card/useCardDriver";
import { installCrashLog, recordCrash } from "@/crash/install";
import { content } from "@/content";
import { OnboardingProvider } from "@/onboarding/OnboardingContext";
import { OnboardingGuard } from "@/onboarding/OnboardingGuard";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { typeScale } from "@/ui/tokens";
import { useTheme } from "@/ui/theme";

// Runs before any DAT reader is called (see core/web/lib/app-core/shims/textDecoder.ts).
installTextDecoderShim();

// Unhandled JS errors and promise rejections go to the crash log (src/crash/).
installCrashLog();

SplashScreen.preventAutoHideAsync();

// Web only: hides scrollbars globally and keeps scrolling working. Native hides them per ScrollView.
// Injected at runtime because the single-page web export does not use src/app/+html.tsx.
const HIDE_SCROLLBARS = "*{scrollbar-width:none}*::-webkit-scrollbar{display:none}";

/** Shown in place of a screen whose render threw. The error text stays on screen so a release build can be diagnosed, and it is written to the crash log. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  useEffect(() => {
    recordCrash("js", error);
  }, [error]);

  return (
    <Screen nativeHeader={false}>
      <Text style={[styles.title, { color: theme.label }]}>{content.common.crashed}</Text>
      <Text selectable style={[styles.message, { color: theme.danger }]}>
        {error.message || String(error)}
      </Text>
      <Button label={content.common.retry} onPress={retry} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { ...typeScale.title3 },
  message: { ...typeScale.subhead },
});

export default function RootLayout() {
  // Noto Sans (v21) loads before the first frame. If loading fails, the app still starts on the system font.
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  });
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = HIDE_SCROLLBARS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const theme = useTheme();

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <OnboardingProvider>
        <CardDriverProvider>
          <OnboardingGuard>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.edge } }} />
          </OnboardingGuard>
        </CardDriverProvider>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}
