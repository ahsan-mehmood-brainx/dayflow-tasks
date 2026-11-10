import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconName } from '@/shared/ui/Icon';

import type { TaskPriority } from '../../domain/task';
import { PRIORITY_LABELS } from '../formatting';

/** Priority is conveyed by label and icon shape as well as colour. */
export const PRIORITY_APPEARANCE: Record<TaskPriority, { icon: IconName; color: string; background: string }> = {
  high: { icon: 'arrow-up', color: colors.priorityHigh, background: colors.priorityHighSoft },
  medium: { icon: 'remove', color: colors.priorityMedium, background: colors.priorityMediumSoft },
  low: { icon: 'arrow-down', color: colors.priorityLow, background: colors.priorityLowSoft },
};

export function PriorityBadge({ priority }: { readonly priority: TaskPriority }) {
  const appearance = PRIORITY_APPEARANCE[priority];

  return (
    <View
      accessible
      accessibilityLabel={`${PRIORITY_LABELS[priority]} priority`}
      style={[styles.badge, { backgroundColor: appearance.background }]}
    >
      <Icon name={appearance.icon} size={12} color={appearance.color} />
      <AppText variant="caption" style={{ color: appearance.color }} maxFontSizeMultiplier={1.4}>
        {PRIORITY_LABELS[priority].toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
});
