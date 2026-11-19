import type { NativeStackNavigationOptions } from "expo-router";
import { Platform } from "react-native";

type Options = { title?: string; largeTitle?: boolean; transparent?: boolean };

/**
 * Native Stack header options for a route. iOS gets the system header (minimal back button, optional large title).
 * Android returns {} and keeps the in-screen ScreenHeader.
 */
export function navHeader({ title, largeTitle = false, transparent = false }: Options = {}): NativeStackNavigationOptions {
  if (Platform.OS !== "ios") return {};
  return {
    headerShown: true,
    headerLargeTitleEnabled: largeTitle,
    headerTransparent: transparent,
    headerBackButtonDisplayMode: "minimal",
    ...(title !== undefined ? { headerTitle: title } : {}),
  };
}
