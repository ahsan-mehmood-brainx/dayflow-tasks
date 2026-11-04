import type { CalendarDate, IsoTimestamp } from '@/shared/lib/calendarDate';

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskId = string;

interface TaskFields {
  readonly id: TaskId;
  readonly title: string;
  readonly description: string;
  readonly priority: TaskPriority;
  /** Optional deadline as a calendar day; a task without one is "unscheduled". */
  readonly dueDate: CalendarDate | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Completion state is a discriminated union so the model cannot describe an inconsistent task,
 * such as one marked completed without a completion time.
 */
export type ActiveTask = TaskFields & { readonly status: 'active'; readonly completedAt: null };
export type CompletedTask = TaskFields & { readonly status: 'completed'; readonly completedAt: IsoTimestamp };
export type Task = ActiveTask | CompletedTask;

/** The user-editable fields, used for both creating and editing a task. */
export interface TaskDraft {
  readonly title: string;
  readonly description: string;
  readonly priority: TaskPriority;
  readonly dueDate: CalendarDate | null;
}

export type TaskDraftField = keyof TaskDraft;
export type TaskDraftErrors = Partial<Record<TaskDraftField, string>>;

/** Where a task sits relative to today; drives grouping and visual state. */
export type TaskTimeframe = 'completed' | 'overdue' | 'today' | 'upcoming' | 'unscheduled';
