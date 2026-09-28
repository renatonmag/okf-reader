/**
 * The two control shapes the display settings need: pick one of a few options,
 * or step a number within a range. Both take a `disabled` flag so the reader's
 * own settings sheet can grey out what the current format cannot honour —
 * fixed-layout PDFs and font size, for instance — rather than silently ignoring it.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <ThemedText>{label}</ThemedText>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.id}
            disabled={disabled}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  option.id === value ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}>
            <ThemedText type="small">{option.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function StepperRow({
  label,
  value,
  range,
  format,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  range: { readonly min: number; readonly max: number; readonly step: number };
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  // Rounded because repeated float steps drift (1.5 + 0.1 is not 1.6).
  const step = (direction: 1 | -1) => {
    const next = Math.round((value + direction * range.step) * 100) / 100;
    if (next < range.min || next > range.max) return;
    onChange(next);
  };

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <ThemedText>{label}</ThemedText>
      <View style={styles.options}>
        <Pressable
          disabled={disabled || value <= range.min}
          onPress={() => step(-1)}
          style={[styles.stepper, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">−</ThemedText>
        </Pressable>
        <ThemedText type="small" style={styles.stepperValue}>
          {format(value)}
        </ThemedText>
        <Pressable
          disabled={disabled || value >= range.max}
          onPress={() => step(1)}
          style={[styles.stepper, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 44,
  },
  disabled: { opacity: 0.4 },
  options: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  stepper: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.one,
  },
  stepperValue: { minWidth: 44, textAlign: 'center' },
});
