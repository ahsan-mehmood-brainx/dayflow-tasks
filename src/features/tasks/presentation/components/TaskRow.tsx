import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CalendarDate } from '@/shared/lib/calendarDate';
import { colors, screenGutter, sizes, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

import type { Task, TaskId } from '../../domain/task';
import type { TaskMutationKind } from '../../state/tasksSlice';
import { describeTaskForAccessibility } from '../formatting';

import { CompletionToggle } from './CompletionToggle';
import { DueDateLabel } from './DueDateLabel';
import { PriorityBadge } from './PriorityBadge';

interface TaskRowProps {
  readonly task: Task;
  readonly today: CalendarDate;
  readonly mutation: TaskMutationKind | null;
  readonly onToggleCompletion: (task: Task) => void;
  readonly onOpen: (id: TaskId) => void;
}

/** One task in a list. Memoised: list screens pass stable callbacks so unchanged rows skip re-rendering. */
export const TaskRow = memo(function TaskRow({ task, today, mutation, onToggleCompletion, onOpen }: TaskRowProps) {
  const completed = task.status === 'completed';

  return (
    <View style={[styles.row, mutation === 'delete' && styles.rowBusy]}>
      <CompletionToggle
        title={task.title}
        completed={completed}
        pending={mutation === 'completion'}
        onToggle={() => onToggleCompletion(task)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={describeTaskForAccessibility(task, today)}
        accessibilityHint="Opens task details"
        onPress={() => onOpen(task.id)}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
      >
        <View style={styles.text}>
          <AppText variant="body" tone={completed ? 'tertiary' : 'primary'} numberOfLines={2} style={completed && styles.titleCompleted}>
            {task.title}
          </AppText>
          <View style={styles.meta}>
            {completed ? (
              <AppText variant="footnote" tone="success">
                Completed
              </AppText>
            ) : (
              <DueDateLabel task={task} today={today} />
            )}
            <PriorityBadge priority={task.priority} />
          </View>
        </View>
        <Icon name="chevron-forward" size={sizes.iconSm} color={colors.border} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: screenGutter - spacing.md,
  },
  rowBusy: {
    opacity: 0.5,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: screenGutter,
    borderBottomWidth: sizes.hairline,
    borderBottomColor: colors.separator,
  },
  bodyPressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
