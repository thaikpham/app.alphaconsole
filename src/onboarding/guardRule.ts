// Onboarding redirects (pure): where the root guard sends the user, from the first-launch flag and the all-files
// access state. No React or native imports.

/** The screen group a route belongs to. "app" is every other screen (sets, write, preview, ...). */
export type RouteKind = "home" | "device" | "intro" | "access" | "app";

export type GuardTarget = "/" | "/onboarding/device" | "/onboarding/access";

export type GuardInput = {
  /** Null while the first-launch flag is still loading. */
  seen: boolean | null;
  /** True once the first all-files access check has settled. */
  accessChecked: boolean;
  access: boolean | null;
  /** Set by "Để sau" for this session. */
  deferred: boolean;
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
    case "access":
      return "access";
    default:
      return "app";
  }
}

/**
 * The screen the guard moves to, or null to stay. First launch goes to the device pick and keeps the user in the
 * onboarding screens until the flag is saved. After that, refused all-files access shows the access gate until the
 * user defers it; the gate leaves once access is granted or deferred. Device and intro stay reachable (intro from the overflow).
 */
export function guardTarget(input: GuardInput): GuardTarget | null {
  const { seen, accessChecked, access, deferred, route } = input;
  if (seen === null) return null;
  if (!seen) return route === "device" || route === "intro" ? null : "/onboarding/device";
  if (route === "device" || route === "intro") return null;
  if (!accessChecked) return null;
  const refused = access === false && !deferred;
  if (route === "access") return refused ? null : "/";
  return refused ? "/onboarding/access" : null;
}
