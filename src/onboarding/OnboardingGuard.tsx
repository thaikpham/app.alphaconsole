// Root guard: sends a first launch through the device pick (see guardRule.ts). Children always render;
// a theme-coloured cover hides them until the guard has settled, so no screen flashes before a redirect.
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";

import { useTheme } from "@/ui/theme";
import { guardTarget, routeOf } from "./guardRule";
import { useOnboarding } from "./OnboardingContext";

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const navKey = useRootNavigationState()?.key;
  const { seen } = useOnboarding();

  const target = guardTarget({ seen, route: routeOf(segments) });

  useEffect(() => {
    if (!navKey || target === null) return;
    router.replace(target);
  }, [navKey, target, router]);

  const settled = target === null && navKey !== undefined && seen !== null;

  return (
    <>
      {children}
      {settled ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} />}
    </>
  );
}
