// Root guard: sends the user through onboarding and the access gate (see guardRule.ts). Children always render;
// a theme-coloured cover hides them until the guard has settled, so no screen flashes before a redirect.
import { useEffect, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { usePathname, useRootNavigationState, useRouter, useSegments } from "expo-router";

import { useCardDriver } from "@/card/useCardDriver";
import { useTheme } from "@/ui/theme";
import { exitRoute, guardTarget, routeOf } from "./guardRule";
import { useOnboarding } from "./OnboardingContext";

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const navKey = useRootNavigationState()?.key;
  const { seen } = useOnboarding();
  const { access, accessChecked, deferred } = useCardDriver();
  // The app route a redirect interrupted. Leaving the gate returns there.
  const interrupted = useRef<string | null>(null);

  const target = guardTarget({
    seen,
    accessChecked,
    access,
    deferred,
    gateOnLoad: Platform.OS !== "web",
    route: routeOf(segments),
  });

  useEffect(() => {
    if (!navKey || target === null) return;
    if (target !== "/" && !pathname.startsWith("/onboarding")) interrupted.current = pathname;
    router.replace(exitRoute(target, interrupted.current));
    if (target === "/") interrupted.current = null;
  }, [navKey, target, pathname, router]);

  const settled = target === null && navKey !== undefined && seen !== null && accessChecked;

  return (
    <>
      {children}
      {settled ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} />}
    </>
  );
}
