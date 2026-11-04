import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  readonly icon: IconName;
  readonly title: string;
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly tone?: 'neutral' | 'error';
}

export function EmptyState({ icon, title, message, actionLabel, onAction, tone = 'neutral' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWell, tone === 'error' && styles.iconWellError]}>
        <Icon name={icon} size={28} color={tone === 'error' ? colors.danger : colors.accent} />
      </View>
      <AppText variant="headline" accessibilityRole="header" style={styles.centered}>
        {title}
      </AppText>
      <AppText variant="callout" tone="secondary" style={styles.centered}>
        {message}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" size="compact" style={styles.action} /> : null}
    </View>
  );
}

export function LoadingView({ label }: { readonly label: string }) {
  return (
    <View style={styles.container} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <ActivityIndicator color={colors.accent} />
      <AppText variant="callout" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.huge,
  },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.sm,
  },
  iconWellError: {
    backgroundColor: colors.dangerSoft,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
});
