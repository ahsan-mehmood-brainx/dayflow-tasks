import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/shared/theme/tokens';

export type TextVariant = keyof typeof typography;
export type TextTone = keyof typeof toneStyles;

const toneStyles = StyleSheet.create({
  primary: { color: colors.textPrimary },
  secondary: { color: colors.textSecondary },
  tertiary: { color: colors.textTertiary },
  accent: { color: colors.accent },
  danger: { color: colors.danger },
  success: { color: colors.success },
  onAccent: { color: colors.textOnAccent },
});

export interface AppTextProps extends TextProps {
  readonly variant?: TextVariant;
  readonly tone?: TextTone;
}

/** Text bound to the type scale and colour tokens. Honours the OS font-size setting. */
export function AppText({ variant = 'body', tone = 'primary', style, ...props }: AppTextProps) {
  return <Text {...props} style={[typography[variant], toneStyles[tone], style]} />;
}
