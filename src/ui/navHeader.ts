import type { NativeStackNavigationOptions } from "expo-router";

type Options = { title?: string; largeTitle?: boolean; transparent?: boolean };

/**
 * Native Stack header options for a route, used on both platforms. `largeTitle` and the minimal back button are iOS-only; Android ignores them.
 */
export function navHeader({ title, largeTitle = false, transparent = false }: Options = {}): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerLargeTitleEnabled: largeTitle,
    headerTransparent: transparent,
    headerBackButtonDisplayMode: "minimal",
    ...(title !== undefined ? { headerTitle: title } : {}),
  };
}
