import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

interface BannerProps {
  readonly tone: 'error' | 'info';
  readonly message: string;
  readonly title?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

/** Inline, non-blocking message. Errors are announced as alerts. */
export function Banner({ tone, message, title, actionLabel, onAction }: BannerProps) {
  const isError = tone === 'error';

  // `accessibilityLiveRegion` only works on Android; announce explicitly so iOS users hear errors too.
  useEffect(() => {
    if (isError) AccessibilityInfo.announceForAccessibility(title ? `${title}. ${message}` : message);
  }, [isError, title, message]);

  return (
    <View
      accessibilityRole={isError ? 'alert' : 'summary'}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      style={[styles.container, isError ? styles.error : styles.info]}
    >
      <Icon name={isError ? 'alert-circle' : 'information-circle-outline'} size={sizes.iconMd} color={isError ? colors.danger : colors.accent} />
      <View style={styles.body}>
        {title ? <AppText variant="bodyStrong">{title}</AppText> : null}
        <AppText variant="callout" tone="secondary">
          {message}
        </AppText>
      </View>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="ghost" size="compact" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    borderRadius: radii.md,
  },
  error: {
    backgroundColor: colors.dangerSoft,
  },
  info: {
    backgroundColor: colors.accentSoft,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
});
