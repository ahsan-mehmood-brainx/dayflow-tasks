import { cancelledError, type AppError } from '@/shared/lib/appError';
import { err, ok, type Result } from '@/shared/lib/result';
import { wait } from '@/shared/lib/wait';

import type { Task, TaskDraft, TaskId } from '../domain/task';
import type { RequestOptions, TaskRepository } from '../domain/TaskRepository';
import {
  buildTask,
  changeTaskCompletion,
  invalidTaskDraftError,
  invalidTaskIdError,
  isValidTaskId,
  reviseTask,
  taskNotFoundError,
} from '../domain/taskRules';

export interface MockTaskRepositoryOptions {
  readonly seed?: readonly Task[];
  /** Delay before each operation resolves, so loading states are visible in the demo. */
  readonly latencyMs?: number;
  readonly now?: () => Date;
  readonly createId?: () => TaskId;
}

function createSequentialId(): () => TaskId {
  let sequence = 0;
  return () => `mock-${Date.now().toString(36)}-${(sequence += 1).toString(36)}`;
}

/**
 * In-memory TaskRepository for the demo and tests. State lives for the app session only and every
 * write goes through the same domain rules a server would enforce.
 */
export class MockTaskRepository implements TaskRepository {
  private readonly tasks = new Map<TaskId, Task>();
  private readonly latencyMs: number;
  private readonly now: () => Date;
  private readonly createId: () => TaskId;

  constructor({ seed = [], latencyMs = 0, now = () => new Date(), createId = createSequentialId() }: MockTaskRepositoryOptions = {}) {
    for (const task of seed) this.tasks.set(task.id, task);
    this.latencyMs = latencyMs;
    this.now = now;
    this.createId = createId;
  }

  getTasks(options?: RequestOptions): Promise<Result<readonly Task[], AppError>> {
    return this.respond(options, () => ok([...this.tasks.values()]));
  }

  getTaskById(id: TaskId, options?: RequestOptions): Promise<Result<Task, AppError>> {
    return this.respond(options, () => this.find(id));
  }

  createTask(draft: TaskDraft, options?: RequestOptions): Promise<Result<Task, AppError>> {
    return this.respond(options, () => {
      const built = buildTask(draft, this.createId(), this.now());
      if (!built.ok) return err(invalidTaskDraftError(built.error));
      return ok(this.save(built.value));
    });
  }

  updateTask(id: TaskId, draft: TaskDraft, options?: RequestOptions): Promise<Result<Task, AppError>> {
    return this.respond(options, () => {
      const existing = this.find(id);
      if (!existing.ok) return existing;
      const revised = reviseTask(existing.value, draft, this.now());
      if (!revised.ok) return err(invalidTaskDraftError(revised.error));
      return ok(this.save(revised.value));
    });
  }

  deleteTask(id: TaskId, options?: RequestOptions): Promise<Result<void, AppError>> {
    return this.respond(options, () => {
      const existing = this.find(id);
      if (!existing.ok) return existing;
      this.tasks.delete(id);
      return ok(undefined);
    });
  }

  setTaskCompletion(id: TaskId, completed: boolean, options?: RequestOptions): Promise<Result<Task, AppError>> {
    return this.respond(options, () => {
      const existing = this.find(id);
      if (!existing.ok) return existing;
      return ok(this.save(changeTaskCompletion(existing.value, completed, this.now())));
    });
  }

  /** Waits for the simulated latency, then runs the operation unless the caller cancelled meanwhile. */
  private async respond<T>(options: RequestOptions | undefined, operation: () => Result<T, AppError>): Promise<Result<T, AppError>> {
    const outcome = await wait(this.latencyMs, options?.signal);
    return outcome === 'aborted' ? err(cancelledError()) : operation();
  }

  private find(id: TaskId): Result<Task, AppError> {
    if (!isValidTaskId(id)) return err(invalidTaskIdError());
    const task = this.tasks.get(id);
    return task ? ok(task) : err(taskNotFoundError());
  }

  private save(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }
}
