import { ApiService, type FetchFn } from '@/shared/api/ApiService';

import { activeTask, completedTask, validDraft } from '../../testing/taskFixtures';
import { createFakeTaskServer, FAKE_API_BASE_URL, jsonResponse, toTaskDto } from '../../testing/fakeTaskServer';
import { describeTaskRepositoryContract } from '../../testing/taskRepositoryContract';
import { ApiTaskRepository } from '../ApiTaskRepository';
import { MockTaskRepository } from '../MockTaskRepository';

function createRepository(fetch: FetchFn) {
  return new ApiTaskRepository(new ApiService({ baseUrl: FAKE_API_BASE_URL, timeoutMs: 1_000, fetch }));
}

let nextId = 0;
describeTaskRepositoryContract('ApiTaskRepository', (seed, now) =>
  createRepository(createFakeTaskServer(new MockTaskRepository({ seed, now, createId: () => `api-${(nextId += 1)}` }))),
);

describe('ApiTaskRepository', () => {
  it('maps snake_case DTOs to the domain model', async () => {
    const dto = { ...toTaskDto(completedTask({ id: 'task-9' })), description: null, completed_at: null };
    const repository = createRepository(async () => jsonResponse(200, dto));

    const result = await repository.getTaskById('task-9');

    // A completed record without completed_at falls back to updated_at.
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ id: 'task-9', description: '', status: 'completed', completedAt: dto.updated_at }),
    });
  });

  it('sends the write DTO in the API wire format', async () => {
    const fetch = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>(async () => jsonResponse(201, toTaskDto(activeTask())));
    const repository = createRepository(fetch);

    await repository.createTask({ ...validDraft, description: '   ' });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(`${FAKE_API_BASE_URL}/tasks`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      title: validDraft.title,
      description: null,
      priority: validDraft.priority,
      due_date: validDraft.dueDate,
    });
  });

  it('does not send a request when the draft is invalid', async () => {
    const fetch = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>();
    const repository = createRepository(fetch);

    const result = await repository.updateTask('task-1', { ...validDraft, title: '' });

    expect(!result.ok && result.error.kind).toBe('validation');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats a malformed record in a list response as an invalid response', async () => {
    const valid = toTaskDto(activeTask());
    const repository = createRepository(async () => jsonResponse(200, [valid, { ...valid, id: 'task-2', priority: 'urgent' }]));

    const result = await repository.getTasks();

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'invalid_response', detail: expect.stringContaining('tasks[1]') }),
    });
  });

  it('treats a successful DELETE as success whatever the body contains', async () => {
    const repository = createRepository(async () => ({ ok: true, status: 200, text: async () => 'OK' }));

    await expect(repository.deleteTask('task-1')).resolves.toEqual({ ok: true, value: undefined });
  });

  it('only treats 400/422 as a validation problem for create and update', async () => {
    const repository = createRepository(async () => jsonResponse(422, { message: 'nope' }));

    const result = await repository.setTaskCompletion('task-1', true);

    expect(!result.ok && result.error.kind).toBe('http');
  });

  it.each([
    [422, 'validation'],
    [404, 'not_found'],
    [503, 'http'],
  ])('maps HTTP %i on a task write to a %s error', async (status, kind) => {
    const repository = createRepository(async () => jsonResponse(status, { message: 'nope' }));

    const result = await repository.updateTask('task-1', validDraft);

    expect(!result.ok && result.error.kind).toBe(kind);
  });
});
