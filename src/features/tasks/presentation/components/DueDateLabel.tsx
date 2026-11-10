import { StyleSheet, View } from 'react-native';

import type { CalendarDate } from '@/shared/lib/calendarDate';
import { colors, sizes, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

import type { Task } from '../../domain/task';
import { getTaskTimeframe } from '../../domain/taskRules';
import { formatDueDate } from '../formatting';

/** Due date with its timeframe made explicit in words ("Overdue · Yesterday"), not only in colour. */
export function DueDateLabel({ task, today }: { readonly task: Task; readonly today: CalendarDate }) {
  if (task.dueDate === null) {
    return (
      <AppText variant="footnote" tone="tertiary">
        No due date
      </AppText>
    );
  }

  const timeframe = getTaskTimeframe(task, today);
  const formatted = formatDueDate(task.dueDate, today);
  const isOverdue = timeframe === 'overdue';
  const isToday = timeframe === 'today';
  const text = isOverdue ? `Overdue · ${formatted}` : formatted;

  return (
    <View style={styles.row} accessible accessibilityLabel={isOverdue ? `Overdue, was due ${formatted}` : `Due ${formatted}`}>
      <Icon
        name={isOverdue ? 'alert-circle' : 'calendar-outline'}
        size={sizes.iconSm - 2}
        color={isOverdue ? colors.danger : isToday ? colors.accent : colors.textTertiary}
      />
      <AppText variant="footnote" tone={isOverdue ? 'danger' : isToday ? 'accent' : 'tertiary'}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
