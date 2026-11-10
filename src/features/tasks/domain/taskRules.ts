import { notFoundError, validationError, type AppError } from '@/shared/lib/appError';
import { isCalendarDate, type CalendarDate } from '@/shared/lib/calendarDate';
import { err, ok, type Result } from '@/shared/lib/result';

import {
  TASK_PRIORITIES,
  type ActiveTask,
  type Task,
  type TaskDraft,
  type TaskDraftErrors,
  type TaskId,
  type TaskPriority,
  type TaskTimeframe,
} from './task';

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;

const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.some((priority) => priority === value);
}

export function isValidTaskId(id: string): boolean {
  return TASK_ID_PATTERN.test(id);
}

/** Validates and normalises (trims) a draft. Used by forms for inline errors and by every write path. */
export function validateTaskDraft(draft: TaskDraft): Result<TaskDraft, TaskDraftErrors> {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const errors: TaskDraftErrors = {};

  if (title.length === 0) {
    errors.title = 'Enter a title.';
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  if (!isTaskPriority(draft.priority)) {
    errors.priority = 'Choose a priority.';
  }
  if (draft.dueDate !== null && !isCalendarDate(draft.dueDate)) {
    errors.dueDate = 'Choose a valid due date.';
  }

  if (Object.keys(errors).length > 0) return err(errors);
  return ok({ title, description, priority: draft.priority, dueDate: draft.dueDate });
}

/** Builds a new active task. Validation is part of construction, so an invalid task cannot be created. */
export function buildTask(draft: TaskDraft, id: TaskId, now: Date): Result<ActiveTask, TaskDraftErrors> {
  const validated = validateTaskDraft(draft);
  if (!validated.ok) return validated;

  const timestamp = now.toISOString();
  return ok({ ...validated.value, id, status: 'active', completedAt: null, createdAt: timestamp, updatedAt: timestamp });
}

/** Applies edited fields. Identity, creation time and completion state are preserved. */
export function reviseTask(task: Task, draft: TaskDraft, now: Date): Result<Task, TaskDraftErrors> {
  const validated = validateTaskDraft(draft);
  if (!validated.ok) return validated;

  return ok({ ...task, ...validated.value, id: task.id, createdAt: task.createdAt, updatedAt: now.toISOString() });
}

/** Completes or reopens a task. Repeating the current state is a no-op and keeps `updatedAt` unchanged. */
export function changeTaskCompletion(task: Task, completed: boolean, now: Date): Task {
  if (completed === (task.status === 'completed')) return task;

  const timestamp = now.toISOString();
  return completed
    ? { ...task, status: 'completed', completedAt: timestamp, updatedAt: timestamp }
    : { ...task, status: 'active', completedAt: null, updatedAt: timestamp };
}

export function getTaskTimeframe(task: Task, today: CalendarDate): TaskTimeframe {
  if (task.status === 'completed') return 'completed';
  if (task.dueDate === null) return 'unscheduled';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  return 'upcoming';
}

export function toTaskDraft(task: Task): TaskDraft {
  return { title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate };
}

// Shared error constructors keep messages identical across repository implementations.

export function invalidTaskDraftError(fieldErrors: TaskDraftErrors): AppError {
  return validationError('Some task details need attention.', fieldErrors);
}

export function invalidTaskIdError(): AppError {
  return validationError('That task link is invalid.');
}

export function taskNotFoundError(): AppError {
  return notFoundError('This task no longer exists. It may have been deleted.');
}
