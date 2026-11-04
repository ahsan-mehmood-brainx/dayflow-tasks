import { Pressable, StyleSheet, View } from 'react-native';

import { colors, elevation, radii, sizes, spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
  readonly iconColor?: string;
}

interface SegmentedControlProps<T extends string> {
  readonly options: readonly SegmentOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Priority". */
  readonly accessibilityLabel: string;
}

/** Single-choice selector exposed to assistive technology as a radio group. */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            {option.icon ? <Icon name={option.icon} size={sizes.iconSm} color={option.iconColor ?? colors.textSecondary} /> : null}
            <AppText variant="subhead" tone={selected ? 'primary' : 'secondary'} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: spacing.xxs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...elevation.card,
  },
});
