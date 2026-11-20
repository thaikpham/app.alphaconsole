// Onboarding redirect (pure): sends a first launch to the device pick until the first-launch flag is saved.
// No React or native imports.

/** The screen group a route belongs to. "app" is every other screen (sets, write, preview, ...). */
export type RouteKind = "home" | "device" | "intro" | "app";

export type GuardTarget = "/onboarding/device";

export type GuardInput = {
  /** Null while the first-launch flag is still loading. */
  seen: boolean | null;
  route: RouteKind;
};

/** Route group from the router's segments. The index route reports [] or ["index"]. */
export function routeOf(segments: readonly string[]): RouteKind {
  const path = segments.filter((segment) => segment !== "index");
  if (path.length === 0) return "home";
  if (path[0] !== "onboarding") return "app";
  switch (path[1]) {
    case "device":
      return "device";
    case "intro":
      return "intro";
    default:
      return "app";
  }
}

/**
 * The screen the guard moves to, or null to stay. Until onboarding is seen, every screen but device and intro goes
 * to the device pick. Device and intro stay reachable (intro from the overflow).
 */
export function guardTarget(input: GuardInput): GuardTarget | null {
  const { seen, route } = input;
  if (seen === null || seen) return null;
  return route === "device" || route === "intro" ? null : "/onboarding/device";
}
