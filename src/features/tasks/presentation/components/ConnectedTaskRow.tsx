import { useAppSelector } from '@/core/store/hooks';
import type { CalendarDate } from '@/shared/lib/calendarDate';

import type { Task, TaskId } from '../../domain/task';
import { selectTaskMutation } from '../../state/tasksSelectors';

import { TaskRow } from './TaskRow';

interface ConnectedTaskRowProps {
  readonly task: Task;
  readonly today: CalendarDate;
  readonly onToggle: (task: Task) => void;
  readonly onOpen: (id: TaskId) => void;
}

/** A TaskRow subscribed to its own pending-mutation state, so only the affected row re-renders. */
export function ConnectedTaskRow({ task, today, onToggle, onOpen }: ConnectedTaskRowProps) {
  const mutation = useAppSelector((state) => selectTaskMutation(state, task.id));
  return <TaskRow task={task} today={today} mutation={mutation} onToggleCompletion={onToggle} onOpen={onOpen} />;
}
