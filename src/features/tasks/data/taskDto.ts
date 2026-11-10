import { isCalendarDate, isIsoTimestamp } from '@/shared/lib/calendarDate';
import { err, ok, type Result } from '@/shared/lib/result';

import type { Task, TaskDraft, TaskPriority } from '../domain/task';
import { isTaskPriority, isValidTaskId } from '../domain/taskRules';

/**
 * Wire format of the tasks API (snake_case, boolean completion flag). Kept separate from the domain
 * model so a backend change only affects this file.
 */
export interface TaskDto {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly is_completed: boolean;
  /** `YYYY-MM-DD` or null. */
  readonly due_date: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly completed_at: string | null;
}

export interface TaskWriteDto {
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly due_date: string | null;
}

export interface TaskCompletionDto {
  readonly is_completed: boolean;
}

export function toTaskWriteDto(draft: TaskDraft): TaskWriteDto {
  return {
    title: draft.title,
    description: draft.description === '' ? null : draft.description,
    priority: draft.priority,
    due_date: draft.dueDate,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && isIsoTimestamp(value);
}

/** Validates an untrusted payload against `TaskDto` and maps it to the domain model. */
export function decodeTask(input: unknown): Result<Task, string> {
  if (!isRecord(input)) return err('Task must be an object.');
  const { id, title, description, priority, is_completed, due_date, created_at, updated_at, completed_at } = input;

  if (typeof id !== 'string' || !isValidTaskId(id)) return err('task.id is missing or invalid.');
  if (typeof title !== 'string') return err(`task.title must be a string (id ${id}).`);
  if (description != null && typeof description !== 'string') return err(`task.description must be a string or null (id ${id}).`);
  if (!isTaskPriority(priority)) return err(`task.priority must be low, medium or high (id ${id}).`);
  if (typeof is_completed !== 'boolean') return err(`task.is_completed must be a boolean (id ${id}).`);
  if (due_date != null && !(typeof due_date === 'string' && isCalendarDate(due_date))) {
    return err(`task.due_date must be YYYY-MM-DD or null (id ${id}).`);
  }
  if (!isTimestamp(created_at) || !isTimestamp(updated_at)) return err(`task timestamps must be ISO 8601 (id ${id}).`);
  if (completed_at != null && !isTimestamp(completed_at)) return err(`task.completed_at must be ISO 8601 or null (id ${id}).`);

  const fields = {
    id,
    title,
    description: typeof description === 'string' ? description : '',
    priority,
    dueDate: typeof due_date === 'string' ? due_date : null,
    createdAt: created_at,
    updatedAt: updated_at,
  };

  // Older records may lack completed_at; the last update is the best available completion time.
  return ok(
    is_completed
      ? { ...fields, status: 'completed', completedAt: isTimestamp(completed_at) ? completed_at : updated_at }
      : { ...fields, status: 'active', completedAt: null },
  );
}

export function decodeTaskList(input: unknown): Result<Task[], string> {
  if (!Array.isArray(input)) return err('Task list response must be an array.');

  const tasks: Task[] = [];
  for (const [index, item] of input.entries()) {
    const decoded = decodeTask(item);
    if (!decoded.ok) return err(`tasks[${index}]: ${decoded.error}`);
    tasks.push(decoded.value);
  }
  return ok(tasks);
}
