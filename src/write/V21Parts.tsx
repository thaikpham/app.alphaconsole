// Pieces of the write flow as AlphaApp draws them: camera connect (screen 3), write result (screen 4), recall (screen 5).
// Drawn with Views and the pre-rendered ZV-E10 illustration (assets/v21/zv-e10-*.png, rendered from the design SVG).
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { sceneLook } from "@/home/sceneMap";
import { SceneThumb } from "@/ui/SceneThumb";
import { useTheme } from "@/ui/theme";
import { useReduceMotion } from "@/ui/useReduceMotion";
import { motion, roles, v21 } from "@/ui/v21";

const ART = {
  waiting: { light: require("../../assets/v21/zv-e10-waiting-light.png"), dark: require("../../assets/v21/zv-e10-waiting-dark.png") },
  ok: { light: require("../../assets/v21/zv-e10-ok-light.png"), dark: require("../../assets/v21/zv-e10-ok-dark.png") },
  error: { light: require("../../assets/v21/zv-e10-error-light.png"), dark: require("../../assets/v21/zv-e10-error-dark.png") },
} as const;

export type ArtState = keyof typeof ART;

/** The plug at the phone end, waiting: it pulses (design acl-pulse 1.4 s). Position in the 340×162 art. */
function PulsingPlug() {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) {
      o.set(1);
      return;
    }
    o.set(withRepeat(withTiming(0.35, { duration: motion.pulseMs / 2, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [reduce, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Reanimated.View
      style={[
        styles.plug,
        { backgroundColor: theme.accent, left: `${(284 / 340) * 100}%`, top: `${(138 / 162) * 100}%` },
        style,
      ]}
    />
  );
}

/** Camera + phone + cable, 340:162. */
export function ConnectArt({ state, label }: { state: ArtState; label: string }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.art}>
      <Image source={ART[state][scheme]} style={styles.artImage} resizeMode="contain" />
      {state === "waiting" ? <PulsingPlug /> : null}
    </View>
  );
}

/** Top card of Cắm máy ảnh: the art, then the state below it. */
export function ConnectHero({ state, label, children }: { state: ArtState; label: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: theme.card }]}>
      <ConnectArt state={state} label={label} />
      {children}
    </View>
  );
}

/** "◌ Chờ máy ảnh…": 20/28 bold with a small spinner. */
export function WaitingLine({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.waiting}>
      <ActivityIndicator size="small" color={theme.label} />
      <Text style={[roles.h3, { color: theme.label }]}>{text}</Text>
    </View>
  );
}

/** Numbered step card: a 32 px dark circle with the number, the step title, then an optional picture. */
export function StepCard({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.step, { backgroundColor: theme.card }]}>
      <View style={styles.stepHead}>
        <View style={[styles.stepNum, { backgroundColor: theme.high }]}>
          <Text style={[roles.labelBold, { color: theme.onHigh }]}>{n}</Text>
        </View>
        <Text style={[roles.title, styles.stepTitle, { color: theme.label }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Camera menu picture: Kết nối USB › Mass Storage on the dark menu, picked row in orange. */
export function MassStorageArt({ left, right }: { left: string; right: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Menu máy ảnh: ${left}, ${right}`} style={styles.menuArt}>
      <View style={[styles.menuBar, { width: "46%" }]} />
      <View style={styles.menuPick}>
        <Text style={[roles.captionStrong, styles.white]}>{left}</Text>
        <Text style={[roles.captionStrong, styles.white]}>{right}</Text>
      </View>
      <View style={[styles.menuBar, { width: "62%" }]} />
      <View style={[styles.menuBar, { width: "38%" }]} />
    </View>
  );
}

/** Android drive dialog picture: ổ ZV-E10 with Huỷ / Cho phép. */
export function DrivePickerArt({ drive, cancel, allow }: { drive: string; cancel: string; allow: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Hộp thoại Android: ổ ${drive}, nút ${allow}`}
      style={[styles.pickerArt, { backgroundColor: theme.separator }]}
    >
      <View style={[styles.dialog, { backgroundColor: theme.card }]}>
        <View style={styles.driveRow}>
          <View style={[styles.driveIcon, { borderColor: theme.label }]}>
            <View style={[styles.driveDot, { backgroundColor: theme.label }]} />
            <View style={[styles.driveLine, { backgroundColor: theme.label }]} />
          </View>
          <Text style={[roles.labelSm, { color: theme.label }]}>{drive}</Text>
        </View>
        <View style={styles.dialogActions}>
          <Text style={[roles.captionStrong, styles.cancel, { color: theme.secondary }]}>{cancel}</Text>
          <Text style={[roles.captionStrong, styles.allow, { color: theme.label, borderColor: theme.accent }]}>{allow}</Text>
        </View>
      </View>
    </View>
  );
}

/** Four slot photos of the set (design sumSlots), with or without names under them. */
export function SlotPhotos({ labels, names = true }: { labels: readonly string[]; names?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.photos}>
      {labels.map((label, i) => {
        const look = sceneLook(label);
        return (
          <View key={i} style={styles.photo}>
            <View>
              <SceneThumb scene={look.image} filter={look.filter} scale={look.scale} scrim style={styles.photoThumb} />
              <Text style={[roles.captionStrong, styles.onPhoto, styles.mLabel]}>{`M${i + 1}`}</Text>
            </View>
            {names ? <Text style={[roles.caption, { color: theme.secondary }]}>{label}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

/** "⚠ Đừng rút cáp": 40 px outline pill in the warning colour. */
export function WarnPill({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.warnPill, { borderColor: theme.warning }]}>
      <WarnGlyph color={theme.warning} />
      <Text style={[roles.labelSm, { color: theme.warning }]}>{text}</Text>
    </View>
  );
}

/** Warning triangle: an outlined triangle with a bar and a dot. */
export function WarnGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} importantForAccessibility="no">
      <View style={[styles.triangle, { borderBottomColor: color, borderLeftWidth: size * 0.5, borderRightWidth: size * 0.5, borderBottomWidth: size * 0.86 }]} />
      <Text style={[styles.bang, { fontSize: size * 0.6, lineHeight: size * 0.8 }]}>!</Text>
    </View>
  );
}

/** 128 px result disc: green tick when written, red "!" when the camera kept the old set. */
export function ResultDisc({ ok }: { ok: boolean }) {
  const reduce = useReduceMotion();
  const s = useSharedValue(reduce || !ok ? 1 : 0.6);
  useEffect(() => {
    if (!ok || reduce) return;
    const [a, b, c, d] = motion.popEase;
    s.set(withTiming(1, { duration: motion.popMs, easing: Easing.bezier(a, b, c, d) }));
  }, [ok, reduce, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <Reanimated.View style={[styles.disc, { backgroundColor: ok ? "#127a3a" : "#c8261b" }, style]} importantForAccessibility="no">
      {ok ? <View style={styles.bigTick} /> : <Text style={styles.bigBang}>!</Text>}
    </Reanimated.View>
  );
}

/** Recall checklist row: 104×76 picture, the step, and a 32 px check box. Min 96 tall, radius 24. */
export function RecallItem({
  picture,
  text,
  checked,
  onToggle,
}: {
  picture: ReactNode;
  text: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={text}
      onPress={onToggle}
      style={({ pressed }) => [styles.recall, { backgroundColor: pressed ? theme.press : theme.card }]}
    >
      <View style={[styles.recallPic, { backgroundColor: theme.fill }]}>{picture}</View>
      <Text style={[roles.title, styles.recallText, { color: theme.label }]}>{text}</Text>
      <View
        style={[
          styles.box,
          { borderColor: checked ? "#127a3a" : theme.outline, backgroundColor: checked ? "#127a3a" : "transparent" },
        ]}
      >
        {checked ? <View style={styles.boxTick} /> : null}
      </View>
    </Pressable>
  );
}

/** Rút cáp: camera body with the cable pulled away. */
export function UnplugPicture() {
  const theme = useTheme();
  return (
    <View style={styles.pic}>
      <View style={[styles.camBody, { borderColor: theme.label, backgroundColor: theme.card }]}>
        <View style={[styles.camLens, { borderColor: theme.label }]} />
      </View>
      <View style={[styles.camPort, { backgroundColor: theme.label }]} />
      <View style={[styles.cable, { backgroundColor: theme.accent }]} />
      <View style={[styles.cablePlug, { backgroundColor: theme.accent }]} />
    </View>
  );
}

/** Tắt rồi bật máy: the power symbol. */
export function PowerPicture() {
  const theme = useTheme();
  return (
    <View style={styles.pic}>
      <View style={[styles.powerRing, { borderColor: theme.label }]} />
      <View style={[styles.powerGap, { backgroundColor: theme.fill }]} />
      <View style={[styles.powerBar, { backgroundColor: theme.accent }]} />
    </View>
  );
}

/** Bấm MODE, chọn MR: the mode strip with MR picked. */
export function ModePicture() {
  return (
    <View style={styles.modeStrip}>
      <Text style={[roles.captionStrong, styles.modeOff]}>S</Text>
      <Text style={[roles.captionStrong, styles.modeOff]}>M</Text>
      <Text style={[roles.captionStrong, styles.modeOn]}>MR</Text>
    </View>
  );
}

/** "⚠ Chọn Gọi lại, đừng chọn Lưu" between the recall steps. */
export function RecallWarning({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.recallWarn}>
      <WarnGlyph color={theme.warning} size={22} />
      <Text style={[roles.labelSm, styles.flex, { color: theme.warning }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: v21.white },
  art: { width: "100%", aspectRatio: 340 / 162 },
  artImage: { width: "100%", height: "100%" },
  plug: { position: "absolute", width: `${(12 / 340) * 100}%`, height: `${(14 / 162) * 100}%`, borderRadius: 3.5 },
  hero: { borderRadius: 24, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, alignItems: "center", gap: 12 },
  waiting: { flexDirection: "row", alignItems: "center", gap: 10 },
  step: { borderRadius: 24, padding: 16, gap: 12 },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepTitle: { flex: 1, lineHeight: 26 },
  menuArt: { height: 132, borderRadius: 14, backgroundColor: "#0b0d12", paddingVertical: 14, paddingHorizontal: 16, justifyContent: "center", gap: 10 },
  menuBar: { height: 8, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.22)" },
  menuPick: {
    height: 44,
    borderRadius: 8,
    backgroundColor: v21.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
  },
  pickerArt: { height: 132, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dialog: { width: "80%", borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  driveRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  driveIcon: { width: 20, height: 13, borderWidth: 1.9, borderRadius: 2, marginHorizontal: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 2, gap: 3 },
  driveDot: { width: 2, height: 2, borderRadius: 1, marginTop: 3 },
  driveLine: { width: 6, height: 1.9, marginTop: 3 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10 },
  cancel: { paddingHorizontal: 6 },
  allow: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, overflow: "hidden" },
  photos: { flexDirection: "row", gap: 8, width: "100%" },
  photo: { flex: 1, minWidth: 0, gap: 6 },
  photoThumb: { aspectRatio: 1, borderRadius: 14 },
  onPhoto: { color: v21.white, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  mLabel: { position: "absolute", left: 7, bottom: 5 },
  warnPill: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5 },
  triangle: { width: 0, height: 0, borderLeftColor: "transparent", borderRightColor: "transparent", position: "absolute" },
  bang: { color: v21.white, fontWeight: "700", marginTop: 3 },
  disc: { width: 128, height: 128, borderRadius: 64, alignItems: "center", justifyContent: "center" },
  bigTick: { width: 26, height: 46, marginTop: -10, borderRightWidth: 7, borderBottomWidth: 7, borderColor: v21.white, transform: [{ rotate: "45deg" }] },
  bigBang: { color: v21.white, fontSize: 64, lineHeight: 72, fontWeight: "800" },
  recall: { minHeight: 96, padding: 12, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 14 },
  recallPic: { width: 104, height: 76, borderRadius: 14, overflow: "hidden" },
  recallText: { flex: 1 },
  box: { width: 32, height: 32, margin: 8, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  boxTick: { width: 8, height: 14, marginTop: -3, borderRightWidth: 3.2, borderBottomWidth: 3.2, borderColor: v21.white, transform: [{ rotate: "45deg" }] },
  pic: { flex: 1 },
  camBody: { position: "absolute", left: 44, top: 20, width: 52, height: 38, borderRadius: 7, borderWidth: 2.2, alignItems: "center", justifyContent: "center" },
  camLens: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.2 },
  camPort: { position: "absolute", left: 40, top: 35, width: 6, height: 9, borderRadius: 2 },
  cable: { position: "absolute", left: 4, top: 48, width: 12, height: 4, borderRadius: 2 },
  cablePlug: { position: "absolute", left: 16, top: 45, width: 12, height: 10, borderRadius: 3 },
  powerRing: { position: "absolute", left: 32, top: 18, width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  powerGap: { position: "absolute", left: 45, top: 14, width: 14, height: 14 },
  powerBar: { position: "absolute", left: 50.25, top: 14.25, width: 3.5, height: 23.5, borderRadius: 2 },
  modeStrip: { width: 104, height: 76, borderRadius: 14, backgroundColor: "#0b0d12", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  modeOff: { color: "rgba(255, 255, 255, 0.6)", paddingVertical: 4, paddingHorizontal: 3 },
  modeOn: { color: v21.white, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: v21.primary, overflow: "hidden" },
  recallWarn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, paddingHorizontal: 8 },
});

/** "Khôi phục bản trước?" bottom sheet (AlphaApp screen 5): grabber, title, body, Huỷ and a dark Khôi phục. */
export function RestoreSheet({
  visible,
  title,
  body,
  cancel,
  action,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  cancel: string;
  action: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[sheet.scrim, { backgroundColor: theme.scrim }]} onPress={onCancel} accessibilityLabel={cancel}>
        <Pressable style={[sheet.body, { backgroundColor: theme.sheet }]} onPress={() => undefined} accessibilityRole="none">
          <View style={[sheet.grabber, { backgroundColor: theme.outline }]} />
          <Text accessibilityRole="header" style={[roles.h2, { color: theme.label }]}>
            {title}
          </Text>
          <Text style={[roles.body, sheet.text, { color: theme.secondary }]}>{body}</Text>
          <View style={sheet.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [sheet.button, sheet.outline, { borderColor: theme.outline }, pressed && { backgroundColor: theme.fill }]}
            >
              <Text style={[roles.title, { color: theme.label }]}>{cancel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [sheet.button, { backgroundColor: pressed ? theme.highHover : theme.high }]}
            >
              <Text style={[roles.title, { color: theme.onHigh }]}>{action}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "flex-end" },
  body: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2 },
  text: { lineHeight: 26 },
  actions: { flexDirection: "row", gap: 12 },
  button: { flex: 1, height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  outline: { borderWidth: 1 },
});
