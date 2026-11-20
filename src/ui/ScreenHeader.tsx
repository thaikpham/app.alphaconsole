import { Stack } from "expo-router";
import { navHeader } from "@/ui/navHeader";

/** Sets the native Stack header (title and system back) for the calling route. The system back pops the route. */
export function ScreenHeader({ title }: { title: string }) {
  return <Stack.Screen options={navHeader({ title })} />;
}
