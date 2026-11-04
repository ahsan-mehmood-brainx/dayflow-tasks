import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, sizes, spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: 'regular' | 'compact';
  readonly icon?: IconName;
  /** Shows a spinner and blocks presses while an action is running. */
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly style?: StyleProp<ViewStyle>;
}

const foreground: Record<ButtonVariant, string> = {
  primary: colors.textOnAccent,
  secondary: colors.textPrimary,
  ghost: colors.accent,
  destructive: colors.danger,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const color = foreground[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={size === 'compact' ? spacing.xs : 0}
      style={({ pressed }) => [
        styles.base,
        size === 'compact' ? styles.compact : styles.regular,
        variantStyles[variant],
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : icon ? <Icon name={icon} size={sizes.iconMd} color={color} /> : null}
      <AppText variant={size === 'compact' ? 'subhead' : 'bodyStrong'} style={{ color }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  regular: {
    minHeight: sizes.buttonHeight,
    paddingHorizontal: spacing.xl,
  },
  compact: {
    minHeight: sizes.buttonHeightCompact,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.dangerSoft },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accentPressed },
  secondary: { backgroundColor: colors.surfaceMuted },
  ghost: { backgroundColor: colors.accentSoft },
  destructive: { opacity: 0.8 },
});
