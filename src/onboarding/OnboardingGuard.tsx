// Root guard: sends the user through onboarding and the access gate (see guardRule.ts). Children always render;
// a theme-coloured cover hides them until the guard has settled, so no screen flashes before a redirect.
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";

import { useCardDriver } from "@/card/useCardDriver";
import { useTheme } from "@/ui/theme";
import { guardTarget, routeOf } from "./guardRule";
import { useOnboarding } from "./OnboardingContext";

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const navKey = useRootNavigationState()?.key;
  const { seen } = useOnboarding();
  const { access, accessChecked, deferred } = useCardDriver();

  const target = guardTarget({ seen, accessChecked, access, deferred, route: routeOf(segments) });

  useEffect(() => {
    if (!navKey || target === null) return;
    router.replace(target);
  }, [navKey, target, router]);

  const settled = target === null && navKey !== undefined && seen !== null && accessChecked;

  return (
    <>
      {children}
      {settled ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} />}
    </>
  );
}
