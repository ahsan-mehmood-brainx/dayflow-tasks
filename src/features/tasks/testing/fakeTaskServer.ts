import type { FetchFn, HttpResponse } from '@/shared/api/ApiService';
import type { AppError } from '@/shared/lib/appError';
import type { Result } from '@/shared/lib/result';

import type { TaskDto } from '../data/taskDto';
import type { Task, TaskDraft } from '../domain/task';
import type { TaskRepository } from '../domain/TaskRepository';
import { isTaskPriority } from '../domain/taskRules';

export const FAKE_API_BASE_URL = 'https://api.dayflow.test';

/**
 * An in-process stand-in for the REST API described in the README, backed by any TaskRepository.
 * It speaks the wire format (DTOs, status codes) so ApiTaskRepository is exercised end to end.
 */
export function createFakeTaskServer(backend: TaskRepository): FetchFn {
  return async (url, init) => {
    const match = /^\/tasks(?:\/([^/]+))?$/.exec(url.slice(FAKE_API_BASE_URL.length));
    if (!match) return jsonResponse(404, { message: 'Unknown route' });

    const id = match[1] === undefined ? undefined : decodeURIComponent(match[1]);
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;

    switch (`${init.method ?? 'GET'} ${id === undefined ? 'collection' : 'item'}`) {
      case 'GET collection':
        return reply(await backend.getTasks(), (tasks) => tasks.map(toTaskDto));
      case 'POST collection':
        return reply(await backend.createTask(readWriteDto(body)), toTaskDto, 201);
      case 'GET item':
        return reply(await backend.getTaskById(id ?? ''), toTaskDto);
      case 'PUT item':
        return reply(await backend.updateTask(id ?? '', readWriteDto(body)), toTaskDto);
      case 'PATCH item':
        return reply(await backend.setTaskCompletion(id ?? '', readCompletion(body)), toTaskDto);
      case 'DELETE item':
        return reply(await backend.deleteTask(id ?? ''), () => undefined, 204);
      default:
        return jsonResponse(405, { message: 'Method not allowed' });
    }
  };
}

export function jsonResponse(status: number, body?: unknown): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

function reply<T>(result: Result<T, AppError>, serialise: (value: T) => unknown, status = 200): HttpResponse {
  if (result.ok) return jsonResponse(status, serialise(result.value));
  const errorStatus = result.error.kind === 'not_found' ? 404 : result.error.kind === 'validation' ? 422 : 500;
  return jsonResponse(errorStatus, { message: result.error.message });
}

export function toTaskDto(task: Task): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description === '' ? null : task.description,
    priority: task.priority,
    is_completed: task.status === 'completed',
    due_date: task.dueDate,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readWriteDto(body: unknown): TaskDraft {
  if (!isRecord(body) || typeof body.title !== 'string' || !isTaskPriority(body.priority)) {
    throw new Error(`Fake server received an invalid task body: ${JSON.stringify(body)}`);
  }
  return {
    title: body.title,
    description: typeof body.description === 'string' ? body.description : '',
    priority: body.priority,
    dueDate: typeof body.due_date === 'string' ? body.due_date : null,
  };
}

function readCompletion(body: unknown): boolean {
  if (!isRecord(body) || typeof body.is_completed !== 'boolean') {
    throw new Error(`Fake server received an invalid completion body: ${JSON.stringify(body)}`);
  }
  return body.is_completed;
}
