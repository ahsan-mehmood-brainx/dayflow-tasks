import { usePreventRemove } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, type TextInputInstance, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TaskStackScreenProps } from '@/core/navigation/types';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { runAction } from '@/core/store/runAction';
import { useKeyboardOverlap } from '@/shared/hooks/useKeyboardOverlap';
import { useToday } from '@/shared/hooks/useToday';
import type { CalendarDate } from '@/shared/lib/calendarDate';
import { colors, screenGutter, sizes, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { SegmentedControl, type SegmentOption } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import { useToast } from '@/shared/ui/Toast';

import { TASK_PRIORITIES, type Task, type TaskDraft, type TaskDraftField, type TaskPriority } from '../../domain/task';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, toTaskDraft } from '../../domain/taskRules';
import { selectIsCreatingTask, selectTaskById, selectTaskMutation } from '../../state/tasksSelectors';
import { createTask, updateTask } from '../../state/tasksThunks';
import { DueDatePicker } from '../components/DueDatePicker';
import { MissingTaskState } from '../components/MissingTaskState';
import { PRIORITY_APPEARANCE } from '../components/PriorityBadge';
import { PRIORITY_LABELS } from '../formatting';
import { useTaskForm } from '../hooks/useTaskForm';

const PRIORITY_OPTIONS: readonly SegmentOption<TaskPriority>[] = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
  icon: PRIORITY_APPEARANCE[priority].icon,
  iconColor: PRIORITY_APPEARANCE[priority].color,
}));

export function TaskFormScreen({ navigation, route }: TaskStackScreenProps<'TaskForm'>) {
  const params = route.params;
  const editingId = params.mode === 'edit' ? params.taskId : null;
  const existingTask = useAppSelector((state) => (editingId === null ? undefined : selectTaskById(state, editingId)));

  if (editingId !== null && existingTask === undefined) {
    return <MissingTaskState actionLabel="Close" onAction={navigation.goBack} />;
  }

  // Keyed by what is being edited, so form state can never carry over between different tasks or modes.
  return <TaskForm key={editingId ?? 'create'} navigation={navigation} task={existingTask} />;
}

interface TaskFormProps {
  readonly navigation: TaskStackScreenProps<'TaskForm'>['navigation'];
  /** Present when editing. */
  readonly task: Task | undefined;
}

function TaskForm({ navigation, task }: TaskFormProps) {
  const dispatch = useAppDispatch();
  const showToast = useToast();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const containerRef = useRef<ViewInstance>(null);
  const keyboardOverlap = useKeyboardOverlap(containerRef);
  const isMounted = useRef(true);
  const titleRef = useRef<TextInputInstance>(null);
  const descriptionRef = useRef<TextInputInstance>(null);
  const [saved, setSaved] = useState(false);

  const isEditing = task !== undefined;
  // Busy while *any* change to this task is in flight (e.g. a completion started elsewhere), because the
  // update thunk would decline to run until it settles.
  const isSubmitting = useAppSelector((state) => (task ? selectTaskMutation(state, task.id) !== null : selectIsCreatingTask(state)));

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Captured once: the form edits a snapshot, it doesn't follow later store changes.
  const [initialDraft] = useState<TaskDraft>(() =>
    task ? toTaskDraft(task) : { title: '', description: '', priority: 'medium', dueDate: null },
  );
  // Existing past due dates stay selectable when editing; new tasks start from today.
  const minimumDate: CalendarDate = initialDraft.dueDate !== null && initialDraft.dueDate < today ? initialDraft.dueDate : today;

  const submit = useCallback(
    async (draft: TaskDraft) => {
      const outcome = task ? await runAction(dispatch(updateTask({ id: task.id, draft }))) : await runAction(dispatch(createTask(draft)));
      // If the user closed the form while saving, the inline banner is gone, so report the failure here.
      if (outcome.status === 'failed' && outcome.error.kind !== 'cancelled' && !isMounted.current) {
        showToast(`${task ? 'Couldn’t save your changes' : 'Couldn’t add the task'}. ${outcome.error.message}`, 'error');
      }
      return outcome;
    },
    [dispatch, task, showToast],
  );
  const onSucceeded = useCallback(() => {
    showToast(isEditing ? 'Changes saved' : 'Task added');
    setSaved(true);
  }, [isEditing, showToast]);
  const onInvalid = useCallback((field: TaskDraftField) => {
    if (field === 'title') titleRef.current?.focus();
    if (field === 'description') descriptionRef.current?.focus();
  }, []);

  const form = useTaskForm({ initialDraft, submit, onSucceeded, onInvalid });

  // Guard against losing edits through back gestures or Cancel, but never block a save or an in-flight request.
  usePreventRemove(form.isDirty && !saved && !isSubmitting, ({ data }) => {
    Alert.alert('Discard changes?', 'Your changes to this task will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (saved) navigation.goBack();
  }, [saved, navigation]);

  const submitLabel = isEditing ? 'Save changes' : 'Save task';

  return (
    <View ref={containerRef} style={[styles.screen, { paddingBottom: keyboardOverlap }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {form.submitError ? (
          <Banner tone="error" title={isEditing ? 'Couldn’t save changes' : 'Couldn’t add the task'} message={form.submitError.message} />
        ) : null}

        <TextField
          ref={titleRef}
          label="Title"
          required
          value={form.values.title}
          onChangeText={(text) => form.setField('title', text)}
          onBlur={() => form.markTouched('title')}
          error={form.errors.title}
          placeholder="What needs doing?"
          maxLength={TITLE_MAX_LENGTH}
          showCount
          autoFocus={!isEditing}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => descriptionRef.current?.focus()}
        />

        <TextField
          ref={descriptionRef}
          label="Notes"
          value={form.values.description}
          onChangeText={(text) => form.setField('description', text)}
          onBlur={() => form.markTouched('description')}
          error={form.errors.description}
          placeholder="Add details (optional)"
          maxLength={DESCRIPTION_MAX_LENGTH}
          showCount
          multiline
        />

        <View style={styles.group}>
          <AppText variant="subhead" tone="secondary" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Priority
          </AppText>
          <SegmentedControl
            accessibilityLabel="Priority"
            options={PRIORITY_OPTIONS}
            value={form.values.priority}
            onChange={(priority) => form.setField('priority', priority)}
          />
        </View>

        <DueDatePicker
          value={form.values.dueDate}
          onChange={(dueDate) => form.setField('dueDate', dueDate)}
          today={today}
          minimumDate={minimumDate}
          error={form.errors.dueDate}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: keyboardOverlap > 0 ? spacing.md : Math.max(insets.bottom, spacing.lg) }]}>
        <Button label={submitLabel} icon="checkmark" onPress={() => void form.handleSubmit()} loading={isSubmitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.xl,
    paddingHorizontal: screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  group: {
    gap: spacing.sm,
  },
  footer: {
    paddingHorizontal: screenGutter,
    paddingTop: spacing.md,
    borderTopWidth: sizes.hairline,
    borderTopColor: colors.separator,
    backgroundColor: colors.background,
  },
});
