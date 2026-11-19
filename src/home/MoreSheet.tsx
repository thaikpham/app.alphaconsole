// "Thêm" overflow sheet: the screens that left the home header, plus the app version.
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { content } from "@/content";
import { appVersion } from "@/crash/appInfo";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { typeScale } from "@/ui/tokens";
import { spacing, useTheme } from "@/ui/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const LINKS = [
  { label: content.preview.entry, href: "/preview" },
  { label: content.home.backupsLink, href: "/backups" },
  { label: content.home.guideLink, href: "/guide" },
  { label: content.guide.logsLink, href: "/logs" },
  { label: content.more.intro, href: "/onboarding/intro" },
] as const;

export function MoreSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <BottomSheet visible={visible} title={content.more.title} onClose={onClose}>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Button
            key={link.href}
            label={link.label}
            variant="plain"
            onPress={() => {
              onClose();
              router.push(link.href);
            }}
          />
        ))}
      </View>
      <Text style={[typeScale.subhead, { color: theme.secondary }]}>{`${content.common.version} ${appVersion()}`}</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
});
