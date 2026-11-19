// First-launch flag (onboarding.json) shared by the root guard and the onboarding screens.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { loadOnboardingSeen, saveOnboardingSeen } from "@/storage/onboardingFile";

export type Onboarding = {
  /** Null until the saved flag has been read. */
  seen: boolean | null;
  markSeen: () => void;
};

const OnboardingContext = createContext<Onboarding | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    loadOnboardingSeen()
      .catch(() => false)
      .then((value) => {
        if (alive) setSeen(value);
      });
    return () => {
      alive = false;
    };
  }, []);

  // The flag is kept for this session even when the save fails; the next launch then shows onboarding again.
  const markSeen = useCallback(() => {
    setSeen(true);
    saveOnboardingSeen().catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ seen, markSeen }), [seen, markSeen]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): Onboarding {
  const value = useContext(OnboardingContext);
  if (value === null) throw new Error("useOnboarding is used outside OnboardingProvider");
  return value;
}
