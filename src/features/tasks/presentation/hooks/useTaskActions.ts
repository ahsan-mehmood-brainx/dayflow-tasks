import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useAppDispatch } from '@/core/store/hooks';
import { runAction } from '@/core/store/runAction';
import { useToast } from '@/shared/ui/Toast';

import type { Task } from '../../domain/task';
import { deleteTask, setTaskCompletion } from '../../state/tasksThunks';

/**
 * Task actions shared by list, dashboard and details screens, with consistent user feedback.
 * Success is only reported after the repository confirms.
 */
export function useTaskActions() {
  const dispatch = useAppDispatch();
  const showToast = useToast();

  const toggleCompletion = useCallback(
    async (task: Task) => {
      const completed = task.status !== 'completed';
      const outcome = await runAction(dispatch(setTaskCompletion({ id: task.id, completed })));
      // A cancelled outcome means the session ended mid-request; there is no one to tell.
      if (outcome.status === 'failed' && outcome.error.kind !== 'cancelled') {
        showToast(`Couldn’t update “${task.title}”. ${outcome.error.message}`, 'error');
      }
    },
    [dispatch, showToast],
  );

  /** Asks for confirmation, then deletes. Resolves to true only once the deletion is confirmed. */
  const confirmAndDelete = useCallback(
    (task: Task) =>
      new Promise<boolean>((resolve) => {
        Alert.alert('Delete this task?', `“${task.title}” will be permanently removed.`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const outcome = await runAction(dispatch(deleteTask(task.id)));
              if (outcome.status === 'succeeded') showToast('Task deleted');
              if (outcome.status === 'failed' && outcome.error.kind !== 'cancelled') {
                showToast(`Couldn’t delete the task. ${outcome.error.message}`, 'error');
              }
              resolve(outcome.status === 'succeeded');
            },
          },
        ], { cancelable: true, onDismiss: () => resolve(false) });
      }),
    [dispatch, showToast],
  );

  return { toggleCompletion, confirmAndDelete };
}
