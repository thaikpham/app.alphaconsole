// iOS row sheet (SPEC-IOS §8, canvas 2s). Options beyond SEGMENT_LIMIT get an RN-drawn wheel (O11).
// Same props as ValuePicker.tsx, plus `stepper`: numeric rows get the Stepper (canvas 2o) instead of the wheel.
import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { SEGMENT_LIMIT } from "@/core/web/lib/app-core/sets/rows";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { SegmentedTabs } from "./SegmentedTabs";
import { Stepper } from "./Stepper";
import { Toggle } from "./Toggle";
import { typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";

const AUTO = "auto";
// Wheel rows are 44 pt (SPEC-IOS §2, O11). The frame holds five rows, with the band on the middle one.
const ROW = 44;
const FRAME = 220;
const PAD = (FRAME - ROW) / 2;

type Props = {
  title: string;
  options: readonly string[];
  labelOf: (value: string) => string;
  /** Saved value. undefined is Như máy, "auto" is ISO Auto. */
  current: string | undefined;
  /** Shows the Tự động switch. ISO only. */
  autoable?: boolean;
  /** Shows the Như máy row. kelvin, A–B and G–M cannot be held. */
  canHold: boolean;
  /** Numeric rows: shows the Stepper instead of the wheel. */
  stepper?: boolean;
  /** Called with the chosen value, or undefined for Như máy. */
  onCommit: (value: string | undefined) => void;
  /** Shows Áp cho cả 4 slot when given. Disabled while the row is held. */
  onApplyAll?: (value: string) => void;
  onClose: () => void;
};

/**
 * Row sheet. A stepper for numeric rows, a wheel when there are more than SEGMENT_LIMIT options, a segmented control otherwise.
 * Tự động dims the options and blocks picking. Đặt commits and closes. Áp cho cả 4 slot commits and closes.
 */
export function ValuePicker({
  title,
  options,
  labelOf,
  current,
  autoable = false,
  canHold,
  stepper = false,
  onCommit,
  onApplyAll,
  onClose,
}: Props) {
  const [pending, setPending] = useState<string | undefined>(current);
  // Last concrete option picked. Turning Tự động or Như máy off returns to it.
  const [manual, setManual] = useState<string | undefined>(() =>
    current !== undefined && options.includes(current) ? current : undefined,
  );

  const auto = pending === AUTO;
  const pick = (value: string) => {
    if (auto) return;
    setPending(value);
    setManual(value);
  };

  const setAuto = (on: boolean) => setPending(on ? AUTO : (manual ?? options[0]));

  const setHeld = (held: boolean) => {
    if (auto) return;
    setPending(held ? undefined : (manual ?? options[0]));
  };

  // The wheel stays where the manual value is, even while held or on Tự động.
  const focus = pending !== undefined && !auto ? pending : manual;
  const position = Math.max(0, focus === undefined ? 0 : options.indexOf(focus));

  // Same stepping rules as ValuePicker.tsx. Held and Tự động have no index, so Giảm is off and Tăng starts at the first option.
  const index = pending === undefined || auto ? -1 : options.indexOf(pending);
  const step = (delta: number) => {
    const target = options[index + delta];
    if (target !== undefined) pick(target);
  };
  const shownLabel = pending === undefined ? content.edit.held : auto ? content.edit.auto : labelOf(pending);

  return (
    <BottomSheet visible title={title} onClose={onClose}>
      {autoable ? <Toggle label={content.edit.auto} value={auto} onChange={setAuto} /> : null}
      <View style={auto ? styles.dim : undefined}>
        {stepper ? (
          <Stepper
            value={shownLabel}
            canDecrease={!auto && index > 0}
            canIncrease={!auto && index < options.length - 1}
            onDecrease={() => step(-1)}
            onIncrease={() => step(1)}
          />
        ) : options.length > SEGMENT_LIMIT ? (
          <Wheel
            options={options}
            labelOf={labelOf}
            picked={auto ? undefined : pending}
            position={position}
            enabled={!auto}
            onPick={pick}
          />
        ) : (
          <SegmentedTabs
            options={options.map((value) => ({ value, label: labelOf(value) }))}
            value={pending === undefined || auto ? "" : pending}
            onChange={pick}
          />
        )}
      </View>
      {canHold ? <HeldRow held={pending === undefined} disabled={auto} onHeldChange={setHeld} /> : null}
      {onApplyAll ? (
        <Button
          label={content.edit.applyAll}
          variant="secondary"
          disabled={pending === undefined}
          onPress={() => {
            if (pending === undefined) return;
            onApplyAll(pending);
            onClose();
          }}
        />
      ) : null}
      <Button
        label={content.edit.set}
        onPress={() => {
          onCommit(pending);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

type WheelProps = {
  options: readonly string[];
  labelOf: (value: string) => string;
  /** Row shown as selected. undefined shows no selection (held or Tự động). */
  picked: string | undefined;
  /** Index the wheel is scrolled to. */
  position: number;
  enabled: boolean;
  onPick: (value: string) => void;
};

/** Snap ScrollView wheel. Settling on a row picks it. VoiceOver adjusts it with swipe up and down. */
function Wheel({ options, labelOf, picked, position, enabled, onPick }: WheelProps) {
  const theme = useTheme();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const go = (index: number) => {
    const i = Math.min(options.length - 1, Math.max(0, index));
    const value = options[i];
    if (value === undefined) return;
    scroller.current?.scrollTo({ y: i * ROW, animated: true });
    onPick(value);
  };

  // Picks the row nearest the offset where the scroll settled.
  const settle = (y: number) => {
    const i = Math.min(options.length - 1, Math.max(0, Math.round(y / ROW)));
    const value = options[i];
    if (value !== undefined) onPick(value);
  };

  return (
    <View
      style={styles.frame}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: picked === undefined ? "" : labelOf(picked) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        if (enabled) go(position + (event.nativeEvent.actionName === "increment" ? 1 : -1));
      }}
    >
      <View pointerEvents="none" style={[styles.band, { backgroundColor: theme.fill }]} />
      <ScrollView
        ref={scroller}
        style={StyleSheet.absoluteFill}
        contentOffset={{ x: 0, y: position * ROW }}
        contentContainerStyle={{ paddingVertical: PAD }}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEnabled={enabled}
        accessibilityElementsHidden
        onScrollEndDrag={(event) => settle(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
      >
        {options.map((value, i) => {
          const on = value === picked;
          return (
            <Pressable key={value} disabled={!enabled} onPress={() => go(i)} style={styles.item}>
              <Text style={[on ? typeScale.headline : typeScale.body, { color: on ? theme.label : theme.secondary }]}>
                {labelOf(value)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Như máy as a checkbox. Checked means the row is held. */
function HeldRow({
  held,
  disabled,
  onHeldChange,
}: {
  held: boolean;
  disabled: boolean;
  onHeldChange: (held: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={content.edit.held}
      accessibilityState={{ checked: held, disabled }}
      disabled={disabled}
      onPress={() => onHeldChange(!held)}
      style={({ pressed }) => [styles.heldRow, disabled && styles.dim, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.box,
          { borderColor: held ? theme.accentText : theme.outline, backgroundColor: held ? theme.accent : theme.card },
        ]}
      >
        {held ? <Text style={[styles.tick, { color: theme.onAccent }]}>✓</Text> : null}
      </View>
      <Text style={[typeScale.body, { color: theme.label }]}>{content.edit.held}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  frame: { height: FRAME, overflow: "hidden" },
  band: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    top: PAD,
    height: ROW,
    borderRadius: radii.control,
  },
  item: { height: ROW, alignItems: "center", justifyContent: "center" },
  heldRow: { minHeight: controlHeight, flexDirection: "row", alignItems: "center", gap: spacing.md },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.badge,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tick: { ...typeScale.subhead, fontWeight: "600" },
});
