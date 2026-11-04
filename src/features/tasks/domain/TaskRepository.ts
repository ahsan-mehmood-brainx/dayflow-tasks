import type { AppError } from '@/shared/lib/appError';
import type { Result } from '@/shared/lib/result';

import type { Task, TaskDraft, TaskId } from './task';

export interface RequestOptions {
  /** Aborting resolves the call with a `cancelled` error instead of a late result. */
  readonly signal?: AbortSignal;
}

/**
 * Persistence contract for tasks. Implementations never throw for expected failures; they resolve
 * with an `AppError`:
 * - `validation`: an invalid draft (with per-field errors) or a malformed task ID
 * - `not_found`: no task has the given ID
 * - `network` / `timeout` / `http` / `invalid_response` / `cancelled`: transport failures (API only,
 *   except `cancelled`)
 */
export interface TaskRepository {
  getTasks(options?: RequestOptions): Promise<Result<readonly Task[], AppError>>;
  getTaskById(id: TaskId, options?: RequestOptions): Promise<Result<Task, AppError>>;
  createTask(draft: TaskDraft, options?: RequestOptions): Promise<Result<Task, AppError>>;
  /** Replaces the editable fields of an existing task. */
  updateTask(id: TaskId, draft: TaskDraft, options?: RequestOptions): Promise<Result<Task, AppError>>;
  deleteTask(id: TaskId, options?: RequestOptions): Promise<Result<void, AppError>>;
  setTaskCompletion(id: TaskId, completed: boolean, options?: RequestOptions): Promise<Result<Task, AppError>>;
}
