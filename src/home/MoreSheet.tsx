// Account popover under the header avatar (SPEC §2.5(a), AlphaApp account menu). Replaces the iOS "Thêm" sheet.
// Neutral local profile; no sign-in or sign-out (owner decision A/B). Same base props as before, plus an optional camera opener.
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { content } from "@/content";
import { appVersion } from "@/crash/appInfo";
import { DEFAULT_MODEL, modelById } from "@/core/web/lib/app-core/models";
import { LocalAvatar } from "@/home/LocalAvatar";
import { loadCameraSelection } from "@/storage/cameraFile";
import { CameraIcon, ChevronDownIcon, HelpIcon } from "@/ui/Glyphs";
import { timing, typeScale } from "@/ui/tokens";
import { radii, rowMinHeight, spacing, useTheme } from "@/ui/theme";

// Header height of the Android app bar. The popover hangs below it.
const HEADER_OFFSET = 56;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Opens the camera sheet. The row is hidden when this is not given. Called after this popover closes. */
  onChooseCamera?: () => void;
};

type Action = { key: string; label: string; value?: string; icon: ReactNode; run: () => void };

export function MoreSheet({ visible, onClose, onChooseCamera }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [cameraName, setCameraName] = useState<string>(DEFAULT_MODEL.name);

  // The popover stays mounted between opens, so read the current camera each time it opens.
  useEffect(() => {
    if (!visible) return;
    let live = true;
    loadCameraSelection()
      .then((id) => {
        if (live) setCameraName(id ? (modelById(id)?.name ?? DEFAULT_MODEL.name) : DEFAULT_MODEL.name);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [visible]);

  const primary: (Action | null)[] = [
    onChooseCamera
      ? { key: "camera", label: content.more.camera, value: cameraName, icon: <CameraIcon color={theme.label} size={22} />, run: onChooseCamera }
      : null,
    {
      key: "intro",
      label: content.more.intro,
      icon: <HelpIcon color={theme.label} size={22} />,
      run: () => router.push("/onboarding/intro"),
    },
  ];

  // Screen links kept from the base menu. Shown below a divider with chevrons, so the screens stay reachable.
  const secondary: Action[] = [
    { key: "/preview", label: content.preview.entry, icon: null, run: () => router.push("/preview") },
    { key: "/backups", label: content.home.backupsLink, icon: null, run: () => router.push("/backups") },
    { key: "/guide", label: content.home.guideLink, icon: null, run: () => router.push("/guide") },
    { key: "/logs", label: content.guide.logsLink, icon: null, run: () => router.push("/logs") },
  ];

  const open = (action: Action) => {
    onClose();
    // iOS cannot present a Modal while another is still dismissing: wait out the sheet exit, plus a margin.
    setTimeout(action.run, timing.sheetCloseHoldMs);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        accessibilityRole="menu"
        accessibilityLabel={content.more.title}
        style={[styles.card, { top: insets.top + HEADER_OFFSET, backgroundColor: theme.sheet }]}
      >
        <View style={styles.header}>
          <LocalAvatar diameter={40} glyph={22} color={theme.secondary} />
          <View style={styles.headerText}>
            <Text style={[typeScale.title, { color: theme.label }]} numberOfLines={1}>
              {content.more.profileName}
            </Text>
            <Text style={[typeScale.caption, { color: theme.secondary }]}>{content.more.profileSub}</Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.separator, marginBottom: spacing.sm }]} />
        {primary.filter((action): action is Action => action !== null).map((action) => (
          <Row key={action.key} label={action.label} value={action.value} icon={action.icon} onPress={() => open(action)} />
        ))}
        <View style={[styles.divider, styles.dividerGap, { backgroundColor: theme.separator }]} />
        {secondary.map((action) => (
          <Row key={action.key} label={action.label} icon={action.icon} chevron onPress={() => open(action)} />
        ))}
        <Text style={[typeScale.caption, styles.footer, { color: theme.secondary }]}>{`${content.common.version} ${appVersion()}`}</Text>
      </View>
    </Modal>
  );
}

type RowProps = {
  label: string;
  value?: string;
  icon: ReactNode;
  chevron?: boolean;
  onPress: () => void;
};

function Row({ label, value, icon, chevron = false, onPress }: RowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.press : "transparent" }]}
    >
      {icon}
      <Text style={[typeScale.body, styles.label, { color: theme.label }]}>{label}</Text>
      {value ? <Text style={[typeScale.body, { color: theme.secondary }]}>{value}</Text> : null}
      {chevron ? (
        <View style={styles.chevron}>
          <ChevronDownIcon color={theme.secondary} size={20} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    right: spacing.md,
    width: 288,
    borderRadius: radii.menu,
    overflow: "hidden",
    paddingVertical: spacing.sm,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, minWidth: 0 },
  divider: { height: 1 },
  dividerGap: { marginVertical: spacing.sm },
  row: {
    minHeight: rowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  label: { flex: 1 },
  chevron: { transform: [{ rotate: "-90deg" }] },
  footer: { textAlign: "center", paddingTop: spacing.sm },
});
