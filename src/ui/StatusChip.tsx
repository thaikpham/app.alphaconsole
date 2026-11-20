import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "./tokens";
import { radii, spacing, useTheme, type Palette } from "./theme";

export type ChipTone = "neutral" | "success" | "warning" | "danger";

// Text on tint: same pairs as StatusChip.tsx, each at least 4.5:1 in both palettes (test/theme.test.ts).
function tonePaint(theme: Palette): Record<ChipTone, { background: string; text: string }> {
  return {
    neutral: { background: theme.neutralTint, text: theme.secondary },
    success: { background: theme.successTint, text: theme.success },
    warning: { background: theme.warningTint, text: theme.warning },
    danger: { background: theme.dangerTint, text: theme.danger },
  };
}

type Props = {
  label: string;
  tone?: ChipTone;
};

/** Capsule with tone-coloured text on a tint wash (SPEC-IOS §2). */
export function StatusChip({ label, tone = "neutral" }: Props) {
  const palette = tonePaint(useTheme())[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.background }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: { ...typeScale.subhead },
});
