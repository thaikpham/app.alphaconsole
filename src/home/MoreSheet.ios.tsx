// iOS "Thêm" account and quick menu (SPEC-IOS §9.1, canvas 1119–1126). Same base props as MoreSheet.tsx, plus two optional openers.
// Sign-in and sign-out are hidden (O13). Medium detent is the BottomSheet default.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { content } from "@/content";
import { appVersion } from "@/crash/appInfo";
import { DEFAULT_MODEL, modelById } from "@/core/models";
import { loadCameraSelection } from "@/storage/cameraFile";
import { setStore } from "@/storage/userSetsFile";
import { BottomSheet } from "@/ui/BottomSheet";
import { typeScale } from "@/ui/tokens.ios";
import { radii, rowMinHeight, spacing, useTheme } from "@/ui/theme.ios";

// Screen links from the base MoreSheet. Labels and hrefs match it.
const LINKS = [
  { label: content.preview.entry, href: "/preview" },
  { label: content.home.backupsLink, href: "/backups" },
  { label: content.home.guideLink, href: "/guide" },
  { label: content.guide.logsLink, href: "/logs" },
  { label: content.more.intro, href: "/onboarding/intro" },
] as const;

// BottomSheet.ios exit is 240 ms; a small margin lets its Modal finish unmounting.
const SHEET_EXIT_MS = 280;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Opens the camera sheet. The row is hidden when this is not given. Called after this sheet closes. */
  onChooseCamera?: () => void;
  /** Opens the create set sheet. The row is hidden when this is not given. Called after this sheet closes. */
  onCreateSet?: () => void;
};

export function MoreSheet({ visible, onClose, onChooseCamera, onCreateSet }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const [cameraName, setCameraName] = useState<string>(DEFAULT_MODEL.name);
  const [mineN, setMineN] = useState<number | null>(null);

  // The sheet stays mounted between opens, so read the current camera and set count each time it opens.
  useEffect(() => {
    if (!visible) return;
    let live = true;
    loadCameraSelection()
      .then((id) => {
        if (live) setCameraName(id ? (modelById(id)?.name ?? DEFAULT_MODEL.name) : DEFAULT_MODEL.name);
      })
      .catch(() => undefined);
    setStore
      .load()
      .then(({ user }) => {
        if (live) setMineN(user.length);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [visible]);

  const actions = [
    onChooseCamera ? { key: "camera", label: content.more.camera, value: cameraName, run: onChooseCamera } : null,
    {
      key: "mine",
      label: content.sets.mineTitle,
      value: mineN === null ? undefined : content.more.setCount(mineN),
      run: () => router.setParams({ tab: "mine" }),
    },
    onCreateSet ? { key: "create", label: content.presets.create, value: undefined, run: onCreateSet } : null,
    ...LINKS.map((link) => ({ key: link.href, label: link.label, value: undefined, run: () => router.push(link.href) })),
  ].filter((action) => action !== null);

  return (
    <BottomSheet visible={visible} title={content.more.title} onClose={onClose}>
      <View style={[styles.group, { backgroundColor: theme.cell }]}>
        {actions.map((action, i) => (
          <Row
            key={action.key}
            label={action.label}
            value={action.value}
            first={i === 0}
            onPress={() => {
              onClose();
              // iOS cannot present a Modal while another is still dismissing: wait out the 240 ms sheet exit.
              setTimeout(action.run, SHEET_EXIT_MS);
            }}
          />
        ))}
      </View>
      <Text style={[typeScale.subhead, styles.footer, { color: theme.secondary }]}>
        {`${content.common.version} ${appVersion()}`}
      </Text>
    </BottomSheet>
  );
}

type RowProps = {
  label: string;
  value: string | undefined;
  first: boolean;
  onPress: () => void;
};

function Row({ label, value, first, onPress }: RowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.press : theme.cell },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
      ]}
    >
      <Text style={[typeScale.body, styles.label, { color: theme.label }]}>{label}</Text>
      {value ? <Text style={[typeScale.body, { color: theme.secondary }]}>{value}</Text> : null}
      <Text style={[typeScale.title3, { color: theme.secondary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radii.card, overflow: "hidden" },
  row: {
    minHeight: rowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { flex: 1 },
  footer: { textAlign: "center" },
});
