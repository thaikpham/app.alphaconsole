import { Stack } from "expo-router";
import { navHeader } from "@/ui/navHeader";

type Props = { title: string; onBack: () => void };

/**
 * iOS: no drawn header. Sets the native Stack header (title + minimal system back) for the calling route (O5).
 * The system back pops the route; `onBack` is kept for prop parity with the Android header.
 */
export function ScreenHeader({ title }: Props) {
  return <Stack.Screen options={navHeader({ title })} />;
}
