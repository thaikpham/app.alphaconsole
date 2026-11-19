import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { typeScale } from "@/ui/tokens";
import { controlHeight, spacing, useTheme } from "@/ui/theme";

type Props = { title: string; onBack: () => void };

/** Small "Quay lại" with a chevron on the left, and the title large below it (same title style as Home). */
export function ScreenHeader({ title, onBack }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={content.common.back}
        hitSlop={8}
        onPress={onBack}
        style={styles.back}
      >
        <View style={[styles.chevron, { borderColor: theme.accent }]} />
        <Text style={[styles.backText, { color: theme.accentText }]}>{content.common.back}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.label }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    minHeight: controlHeight,
  },
  chevron: {
    width: 9,
    height: 9,
    marginLeft: spacing.xs,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
  backText: { ...typeScale.subhead },
  title: { ...typeScale.title2 },
});
