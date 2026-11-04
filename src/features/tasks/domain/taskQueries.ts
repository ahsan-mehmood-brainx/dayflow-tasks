import { toCalendarDate, type CalendarDate } from '@/shared/lib/calendarDate';

import type { Task, TaskPriority } from './task';
import { getTaskTimeframe } from './taskRules';

export type TaskStatusFilter = 'all' | 'active' | 'completed';

export interface TaskQuery {
  readonly search: string;
  readonly status: TaskStatusFilter;
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Canonical list order: active before completed. Active tasks run soonest-due first (overdue
 * naturally leads), then unscheduled, with priority and age as tie-breakers. Completed tasks are
 * most-recently-completed first.
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === 'active' ? -1 : 1;

  if (a.status === 'completed' && b.status === 'completed') {
    const byCompletion = Date.parse(b.completedAt) - Date.parse(a.completedAt);
    if (byCompletion !== 0) return byCompletion;
  } else if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }

  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
}

/** Status filter plus a case-insensitive search across title and description. */
export function matchesTaskQuery(task: Task, { search, status }: TaskQuery): boolean {
  if (status !== 'all' && task.status !== status) return false;

  const needle = search.trim().toLocaleLowerCase();
  if (needle === '') return true;
  return task.title.toLocaleLowerCase().includes(needle) || task.description.toLocaleLowerCase().includes(needle);
}

export interface TaskOverview {
  /** Active tasks that are overdue or due today, in list order. */
  readonly focus: readonly Task[];
  /** Active tasks due after today, in list order. */
  readonly upcoming: readonly Task[];
  readonly counts: {
    readonly overdue: number;
    readonly dueToday: number;
    readonly completedToday: number;
    readonly active: number;
  };
}

/**
 * Home-screen summary. Expects `tasks` already in `compareTasks` order (the store keeps them sorted).
 * "Completed today" uses the device's local day, matching what the user sees as today.
 */
export function buildTaskOverview(tasks: readonly Task[], today: CalendarDate): TaskOverview {
  const focus: Task[] = [];
  const upcoming: Task[] = [];
  let overdue = 0;
  let dueToday = 0;
  let completedToday = 0;
  let active = 0;

  for (const task of tasks) {
    if (task.status === 'completed') {
      if (toCalendarDate(new Date(task.completedAt)) === today) completedToday += 1;
      continue;
    }

    active += 1;
    switch (getTaskTimeframe(task, today)) {
      case 'overdue':
        overdue += 1;
        focus.push(task);
        break;
      case 'today':
        dueToday += 1;
        focus.push(task);
        break;
      case 'upcoming':
        upcoming.push(task);
        break;
      default:
        break;
    }
  }

  return { focus, upcoming, counts: { overdue, dueToday, completedToday, active } };
}
