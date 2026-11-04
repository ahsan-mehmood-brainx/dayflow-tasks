import type { ApiService } from '@/shared/api/ApiService';
import { validationError, type AppError } from '@/shared/lib/appError';
import { err, type Result } from '@/shared/lib/result';

import type { Task, TaskDraft, TaskId } from '../domain/task';
import type { RequestOptions, TaskRepository } from '../domain/TaskRepository';
import { invalidTaskDraftError, invalidTaskIdError, isValidTaskId, taskNotFoundError, validateTaskDraft } from '../domain/taskRules';

import { decodeTask, decodeTaskList, toTaskWriteDto, type TaskCompletionDto } from './taskDto';

const TASKS_PATH = '/tasks';

function taskPath(id: TaskId): string {
  return `${TASKS_PATH}/${encodeURIComponent(id)}`;
}

/**
 * TaskRepository backed by a REST API (contract documented in the README).
 * Drafts and IDs are validated before any request is sent, so both implementations reject bad input
 * the same way. HTTP 404 becomes `not_found`; 400/422 on create/update becomes `validation`.
 */
export class ApiTaskRepository implements TaskRepository {
  constructor(private readonly api: ApiService) {}

  getTasks(options?: RequestOptions): Promise<Result<readonly Task[], AppError>> {
    return this.api.request({ method: 'GET', path: TASKS_PATH, signal: options?.signal }, decodeTaskList);
  }

  async getTaskById(id: TaskId, options?: RequestOptions): Promise<Result<Task, AppError>> {
    if (!isValidTaskId(id)) return err(invalidTaskIdError());
    return mapMissingTask(await this.api.request({ method: 'GET', path: taskPath(id), signal: options?.signal }, decodeTask));
  }

  async createTask(draft: TaskDraft, options?: RequestOptions): Promise<Result<Task, AppError>> {
    const validated = validateTaskDraft(draft);
    if (!validated.ok) return err(invalidTaskDraftError(validated.error));

    return mapRejectedWrite(
      await this.api.request(
        { method: 'POST', path: TASKS_PATH, body: toTaskWriteDto(validated.value), signal: options?.signal },
        decodeTask,
      ),
    );
  }

  async updateTask(id: TaskId, draft: TaskDraft, options?: RequestOptions): Promise<Result<Task, AppError>> {
    if (!isValidTaskId(id)) return err(invalidTaskIdError());
    const validated = validateTaskDraft(draft);
    if (!validated.ok) return err(invalidTaskDraftError(validated.error));

    return mapRejectedWrite(
      await this.api.request(
        { method: 'PUT', path: taskPath(id), body: toTaskWriteDto(validated.value), signal: options?.signal },
        decodeTask,
      ),
    );
  }

  async deleteTask(id: TaskId, options?: RequestOptions): Promise<Result<void, AppError>> {
    if (!isValidTaskId(id)) return err(invalidTaskIdError());
    return mapMissingTask(await this.api.send({ method: 'DELETE', path: taskPath(id), signal: options?.signal }));
  }

  async setTaskCompletion(id: TaskId, completed: boolean, options?: RequestOptions): Promise<Result<Task, AppError>> {
    if (!isValidTaskId(id)) return err(invalidTaskIdError());
    const body: TaskCompletionDto = { is_completed: completed };

    return mapMissingTask(await this.api.request({ method: 'PATCH', path: taskPath(id), body, signal: options?.signal }, decodeTask));
  }
}

/** A 404 on a single-task endpoint means the task no longer exists. */
function mapMissingTask<T>(result: Result<T, AppError>): Result<T, AppError> {
  if (!result.ok && result.error.kind === 'http' && result.error.status === 404) return err(taskNotFoundError());
  return result;
}

/** On create/update, 400/422 means the server rejected the submitted details. */
function mapRejectedWrite<T>(result: Result<T, AppError>): Result<T, AppError> {
  if (!result.ok && result.error.kind === 'http' && (result.error.status === 400 || result.error.status === 422)) {
    return err(validationError('The server didn’t accept these task details. Please review them and try again.'));
  }
  return mapMissingTask(result);
}
