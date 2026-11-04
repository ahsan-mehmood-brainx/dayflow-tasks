import { createTestStore, signedInState } from '@/core/testing/createTestStore';
import { signOut } from '@/features/auth/state/authSlice';
import { networkError, type AppError } from '@/shared/lib/appError';
import { err, ok, type Result } from '@/shared/lib/result';
import { createDeferred } from '@/shared/testing/deferred';

import { MockTaskRepository } from '../../data/MockTaskRepository';
import type { Task } from '../../domain/task';
import { activeTask, completedTask, createTestClock, validDraft } from '../../testing/taskFixtures';
import { selectAllTasks, selectTaskById, selectTaskLoad, selectTaskMutation } from '../tasksSelectors';
import { createTask, deleteTask, fetchTasks, setTaskCompletion, updateTask } from '../tasksThunks';

function setup(seed: readonly Task[] = [activeTask({ id: 'task-1' }), completedTask({ id: 'task-2' })]) {
  const repository = new MockTaskRepository({ seed, now: createTestClock(), createId: () => 'task-new' });
  const store = createTestStore({ taskRepository: repository }, signedInState);
  return { repository, store };
}

describe('fetchTasks', () => {
  it('loads tasks into normalised, list-ordered state', async () => {
    const { store } = setup([completedTask({ id: 'done' }), activeTask({ id: 'todo' })]);

    const pending = store.dispatch(fetchTasks());
    expect(selectTaskLoad(store.getState())).toEqual({ status: 'loading' });
    await pending;

    expect(selectTaskLoad(store.getState())).toEqual({ status: 'succeeded' });
    expect(store.getState().tasks.ids).toEqual(['todo', 'done']);
  });

  it('records a failure without leaving the list stuck loading, and recovers on retry', async () => {
    const { repository, store } = setup();
    jest.spyOn(repository, 'getTasks').mockResolvedValueOnce(err(networkError()));

    await store.dispatch(fetchTasks());
    expect(selectTaskLoad(store.getState())).toEqual({ status: 'failed', error: expect.objectContaining({ kind: 'network' }) });

    await store.dispatch(fetchTasks());
    expect(selectTaskLoad(store.getState())).toEqual({ status: 'succeeded' });
    expect(selectAllTasks(store.getState())).toHaveLength(2);
  });

  it('does not touch the repository without a session', async () => {
    const repository = new MockTaskRepository();
    const getTasks = jest.spyOn(repository, 'getTasks');
    const store = createTestStore({ taskRepository: repository });

    await store.dispatch(fetchTasks());

    expect(getTasks).not.toHaveBeenCalled();
  });

  it('does not let a slower list response overwrite changes confirmed while it was loading', async () => {
    const { repository, store } = setup([activeTask({ id: 'task-1' }), activeTask({ id: 'task-2' })]);
    await store.dispatch(fetchTasks());
    const staleList = createDeferred<Result<readonly Task[], AppError>>();
    jest.spyOn(repository, 'getTasks').mockReturnValueOnce(staleList.promise);

    const refresh = store.dispatch(fetchTasks());
    await store.dispatch(setTaskCompletion({ id: 'task-1', completed: true }));
    await store.dispatch(deleteTask('task-2'));
    // The server built this list before either change landed.
    staleList.resolve(ok([activeTask({ id: 'task-1' }), activeTask({ id: 'task-2' }), activeTask({ id: 'task-3' })]));
    await refresh;

    expect(selectTaskById(store.getState(), 'task-1')?.status).toBe('completed');
    expect(selectTaskById(store.getState(), 'task-2')).toBeUndefined();
    expect(selectTaskById(store.getState(), 'task-3')).toBeDefined();
  });

  it('discards a response that arrives after the user signed out', async () => {
    const { repository, store } = setup();
    const response = createDeferred<Result<readonly Task[], AppError>>();
    jest.spyOn(repository, 'getTasks').mockReturnValueOnce(response.promise);

    const pending = store.dispatch(fetchTasks());
    await store.dispatch(signOut());
    response.resolve(ok([activeTask({ id: 'leaked' })]));
    await pending;

    expect(selectAllTasks(store.getState())).toEqual([]);
    expect(selectTaskLoad(store.getState())).toEqual({ status: 'idle' });
  });
});

describe('task mutations', () => {
  it('adds a created task only once, even if Save is pressed repeatedly', async () => {
    const { repository, store } = setup([]);
    const createSpy = jest.spyOn(repository, 'createTask');

    const [first] = await Promise.all([store.dispatch(createTask(validDraft)), store.dispatch(createTask(validDraft))]);

    expect(first.meta.requestStatus).toBe('fulfilled');
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(selectAllTasks(store.getState()).map((task) => task.id)).toEqual(['task-new']);
    expect(store.getState().tasks.createRequestId).toBeNull();
  });

  it('marks a task as pending and only shows it completed once the repository confirms', async () => {
    const { store } = setup();
    await store.dispatch(fetchTasks());

    const pending = store.dispatch(setTaskCompletion({ id: 'task-1', completed: true }));
    expect(selectTaskMutation(store.getState(), 'task-1')).toBe('completion');
    expect(selectTaskById(store.getState(), 'task-1')?.status).toBe('active');
    await pending;

    expect(selectTaskMutation(store.getState(), 'task-1')).toBeNull();
    expect(selectTaskById(store.getState(), 'task-1')).toMatchObject({ status: 'completed', completedAt: expect.any(String) });
  });

  it('leaves the task unchanged and reports the error when a mutation fails', async () => {
    const { repository, store } = setup();
    await store.dispatch(fetchTasks());
    const before = selectTaskById(store.getState(), 'task-1');
    jest.spyOn(repository, 'setTaskCompletion').mockResolvedValueOnce(err(networkError()));

    await expect(store.dispatch(setTaskCompletion({ id: 'task-1', completed: true })).unwrap()).rejects.toMatchObject({ kind: 'network' });

    expect(selectTaskById(store.getState(), 'task-1')).toBe(before);
    expect(selectTaskMutation(store.getState(), 'task-1')).toBeNull();
  });

  it('ignores a second mutation of the same task while the first is running', async () => {
    const { repository, store } = setup();
    await store.dispatch(fetchTasks());
    const completionSpy = jest.spyOn(repository, 'setTaskCompletion');

    await Promise.all([
      store.dispatch(setTaskCompletion({ id: 'task-1', completed: true })),
      store.dispatch(deleteTask('task-1')),
    ]);

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(selectTaskById(store.getState(), 'task-1')?.status).toBe('completed');
  });

  it('applies edits returned by the repository', async () => {
    const { store } = setup();
    await store.dispatch(fetchTasks());

    await store.dispatch(updateTask({ id: 'task-1', draft: { ...validDraft, title: 'Renamed' } }));

    expect(selectTaskById(store.getState(), 'task-1')?.title).toBe('Renamed');
  });

  it('drops a task from the store when the repository says it no longer exists', async () => {
    const { repository, store } = setup();
    await store.dispatch(fetchTasks());
    await repository.deleteTask('task-1'); // Deleted elsewhere, e.g. on another device.

    const result = await store.dispatch(updateTask({ id: 'task-1', draft: validDraft }));

    expect(result.payload).toMatchObject({ kind: 'not_found' });
    expect(selectTaskById(store.getState(), 'task-1')).toBeUndefined();
  });

  it('reports a mutation that completes after sign-out as cancelled, not as a success', async () => {
    const { repository, store } = setup();
    await store.dispatch(fetchTasks());
    const response = createDeferred<Result<void, AppError>>();
    jest.spyOn(repository, 'deleteTask').mockReturnValueOnce(response.promise);

    const pending = store.dispatch(deleteTask('task-1'));
    await store.dispatch(signOut());
    response.resolve(ok(undefined));

    await expect(pending.unwrap()).rejects.toMatchObject({ kind: 'cancelled' });
  });

  it('deletes a task, treating an already-deleted task as success', async () => {
    const { repository, store } = setup();
    await store.dispatch(fetchTasks());
    await repository.deleteTask('task-2');

    await expect(store.dispatch(deleteTask('task-1')).unwrap()).resolves.toBe('task-1');
    await expect(store.dispatch(deleteTask('task-2')).unwrap()).resolves.toBe('task-2');

    expect(selectAllTasks(store.getState())).toEqual([]);
  });
});
