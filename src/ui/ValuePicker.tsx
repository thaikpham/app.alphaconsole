import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { content } from "@/content";
import { SEGMENT_LIMIT } from "@/core/sets/rows";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { SegmentedTabs } from "./SegmentedTabs";
import { Toggle } from "./Toggle";
import { fonts, typeScale } from "./tokens";
import { controlHeight, radii, spacing, useTheme } from "./theme";

const AUTO = "auto";

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
  /** iOS shows the Stepper for numeric rows. Base ignores it. */
  stepper?: boolean;
  /** Called with the chosen value, or undefined for Như máy. */
  onCommit: (value: string | undefined) => void;
  /** Shows Áp cho cả 4 slot when given. Disabled while the row is held. */
  onApplyAll?: (value: string) => void;
  onClose: () => void;
};

/**
 * Row sheet. A stepper when there are more than SEGMENT_LIMIT options, a segmented control otherwise.
 * Tự động dims the options and blocks picking. Đặt commits and closes. Áp cho cả 4 slot commits and closes.
 */
export function ValuePicker({
  title,
  options,
  labelOf,
  current,
  autoable = false,
  canHold,
  onCommit,
  onApplyAll,
  onClose,
}: Props) {
  const theme = useTheme();
  const [pending, setPending] = useState<string | undefined>(current);
  // Last concrete option picked. Turning Tự động or Như máy off returns to it.
  const [manual, setManual] = useState<string | undefined>(() =>
    current !== undefined && options.includes(current) ? current : undefined,
  );

  const auto = pending === AUTO;
  const index = pending === undefined || auto ? -1 : options.indexOf(pending);
  const canDown = !auto && index > 0;
  const canUp = !auto && index < options.length - 1;

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

  const step = (delta: number) => {
    const target = options[index + delta];
    if (target !== undefined) pick(target);
  };

  const shownLabel = pending === undefined ? content.edit.held : auto ? content.edit.auto : labelOf(pending);

  return (
    <BottomSheet visible title={title} onClose={onClose}>
      {autoable ? <Toggle label={content.edit.auto} value={auto} onChange={setAuto} /> : null}
      <View style={auto ? styles.dim : undefined}>
        {options.length > SEGMENT_LIMIT ? (
          <View style={styles.stepper}>
            <StepButton label={content.edit.decrease} glyph="−" disabled={!canDown} onPress={() => step(-1)} />
            <Text style={[styles.stepValue, { color: theme.label }]}>{shownLabel}</Text>
            <StepButton label={content.edit.increase} glyph="+" disabled={!canUp} onPress={() => step(1)} />
          </View>
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

function StepButton({
  label,
  glyph,
  disabled,
  onPress,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.fill },
        disabled && styles.dim,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.glyph, { color: theme.label }]}>{glyph}</Text>
    </Pressable>
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
          { borderColor: held ? theme.high : theme.outline, backgroundColor: held ? theme.high : theme.card },
        ]}
      >
        {held ? <Text style={[styles.tick, { color: theme.onHigh }]}>✓</Text> : null}
      </View>
      <Text style={[styles.heldLabel, { color: theme.label }]}>{content.edit.held}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepButton: {
    width: controlHeight,
    height: controlHeight,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { ...typeScale.title2 },
  stepValue: { ...typeScale.callout, fontFamily: fonts.semibold, flex: 1, textAlign: "center" },
  heldRow: { minHeight: controlHeight, flexDirection: "row", alignItems: "center", gap: spacing.md },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.badge,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tick: { ...typeScale.subhead, fontFamily: fonts.semibold },
  heldLabel: { ...typeScale.callout },
});
