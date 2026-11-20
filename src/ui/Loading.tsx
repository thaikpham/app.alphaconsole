import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

/** Spinner with a label. Shown while an async read or write is pending, so a screen is never blank. */
export function Loading({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={theme.accentText} />
      <Text style={[styles.label, { color: theme.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { ...typeScale.subhead },
});
