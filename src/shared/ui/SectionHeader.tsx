import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';

interface SectionHeaderProps {
  readonly title: string;
  readonly count?: number;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly actionAccessibilityLabel?: string;
}

export function SectionHeader({ title, count, actionLabel, onAction, actionAccessibilityLabel }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="headline" accessibilityRole="header" style={styles.title}>
        {title}
        {count !== undefined ? <AppText variant="headline" tone="tertiary">{`  ${count}`}</AppText> : null}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onAction}
          hitSlop={spacing.md}
        >
          <AppText variant="subhead" tone="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
});
