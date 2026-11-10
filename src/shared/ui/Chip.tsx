import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, sizes, spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly icon?: IconName;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
}

/** A selectable pill. Used inside a radio group, so it reports its checked state. */
export function Chip({ label, selected, onPress, icon, accessibilityLabel, accessibilityHint }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={sizes.iconSm} color={selected ? colors.textOnAccent : colors.textSecondary} /> : null}
      <AppText variant="subhead" tone={selected ? 'onAccent' : 'secondary'} maxFontSizeMultiplier={1.4}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
