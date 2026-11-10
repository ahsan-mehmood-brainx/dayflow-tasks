import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { TaskStackScreenProps } from '@/core/navigation/types';
import { useAppSelector } from '@/core/store/hooks';
import { useToday } from '@/shared/hooks/useToday';
import { colors, elevation, radii, screenGutter, sizes, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon, type IconName } from '@/shared/ui/Icon';

import type { Task } from '../../domain/task';
import { getTaskTimeframe } from '../../domain/taskRules';
import { selectTaskById, selectTaskMutation } from '../../state/tasksSelectors';
import { DueDateLabel } from '../components/DueDateLabel';
import { MissingTaskState } from '../components/MissingTaskState';
import { PriorityBadge } from '../components/PriorityBadge';
import { formatTimestamp } from '../formatting';
import { useTaskActions } from '../hooks/useTaskActions';

export function TaskDetailsScreen({ navigation, route }: TaskStackScreenProps<'TaskDetails'>) {
  const { taskId } = route.params;
  const today = useToday();
  const storedTask = useAppSelector((state) => selectTaskById(state, taskId));
  const mutation = useAppSelector((state) => selectTaskMutation(state, taskId));
  const { toggleCompletion, confirmAndDelete } = useTaskActions();

  // Keeps the task on screen while its confirmed deletion navigates back, instead of flashing "not found".
  const [deletingSnapshot, setDeletingSnapshot] = useState<Task | null>(null);
  const task = storedTask ?? deletingSnapshot ?? undefined;

  if (!task) {
    return <MissingTaskState actionLabel="Back to tasks" onAction={() => navigation.popTo('TaskList')} />;
  }

  const completed = task.status === 'completed';
  const busy = mutation !== null;
  const timeframe = getTaskTimeframe(task, today);

  const handleDelete = async () => {
    setDeletingSnapshot(task);
    const deleted = await confirmAndDelete(task);
    if (deleted) navigation.goBack();
    else setDeletingSnapshot(null);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <StatusPill completed={completed} overdue={timeframe === 'overdue'} />
        <AppText variant="title" accessibilityRole="header" style={completed && styles.titleCompleted}>
          {task.title}
        </AppText>
      </View>

      <View style={styles.card}>
        <DetailRow icon="flag-outline" label="Priority">
          <PriorityBadge priority={task.priority} />
        </DetailRow>
        <DetailRow icon="calendar-outline" label="Due">
          <DueDateLabel task={task} today={today} />
        </DetailRow>
        {task.completedAt ? (
          <DetailRow icon="checkmark-circle-outline" label="Completed">
            <AppText variant="footnote" tone="secondary">
              {formatTimestamp(task.completedAt)}
            </AppText>
          </DetailRow>
        ) : null}
        <DetailRow icon="time-outline" label="Created">
          <AppText variant="footnote" tone="secondary">
            {formatTimestamp(task.createdAt)}
          </AppText>
        </DetailRow>
        <DetailRow icon="create-outline" label="Updated" last>
          <AppText variant="footnote" tone="secondary">
            {formatTimestamp(task.updatedAt)}
          </AppText>
        </DetailRow>
      </View>

      <View style={styles.description}>
        <AppText variant="subhead" tone="secondary" accessibilityRole="header">
          Notes
        </AppText>
        <AppText variant="body" tone={task.description ? 'primary' : 'tertiary'}>
          {task.description || 'No notes for this task.'}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          label={completed ? 'Reopen task' : 'Mark as done'}
          icon={completed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
          onPress={() => void toggleCompletion(task)}
          loading={mutation === 'completion'}
          disabled={busy && mutation !== 'completion'}
        />
        <Button
          label="Edit task"
          icon="create-outline"
          variant="secondary"
          onPress={() => navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id })}
          disabled={busy}
        />
        <Button
          label="Delete task"
          icon="trash-outline"
          variant="destructive"
          onPress={() => void handleDelete()}
          loading={mutation === 'delete'}
          disabled={busy && mutation !== 'delete'}
          accessibilityHint="Asks for confirmation before deleting"
        />
      </View>
    </ScrollView>
  );
}

function StatusPill({ completed, overdue }: { readonly completed: boolean; readonly overdue: boolean }) {
  const appearance = completed
    ? { icon: 'checkmark-circle' as const, label: 'Completed', color: colors.success, background: colors.successSoft }
    : overdue
      ? { icon: 'alert-circle' as const, label: 'Overdue', color: colors.danger, background: colors.dangerSoft }
      : { icon: 'ellipse-outline' as const, label: 'Active', color: colors.accent, background: colors.accentSoft };

  return (
    <View style={[styles.pill, { backgroundColor: appearance.background }]} accessible accessibilityLabel={`Status: ${appearance.label}`}>
      <Icon name={appearance.icon} size={sizes.iconSm} color={appearance.color} />
      <AppText variant="caption" style={{ color: appearance.color }}>
        {appearance.label.toUpperCase()}
      </AppText>
    </View>
  );
}

function DetailRow({ icon, label, children, last = false }: { icon: IconName; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
      <View style={styles.detailLabel}>
        <Icon name={icon} size={sizes.iconSm} color={colors.textTertiary} />
        <AppText variant="callout" tone="secondary">
          {label}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
  },
  header: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  titleCompleted: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  card: {
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: sizes.touchTarget + 4,
    paddingVertical: spacing.sm,
  },
  detailRowDivider: {
    borderBottomWidth: sizes.hairline,
    borderBottomColor: colors.separator,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  description: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});
