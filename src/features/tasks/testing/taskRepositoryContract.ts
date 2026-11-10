import type { Task } from '../domain/task';
import type { TaskRepository } from '../domain/TaskRepository';

import { activeTask, completedTask, createTestClock, FIXED_NOW, validDraft } from './taskFixtures';

export type RepositoryFactory = (seed: readonly Task[], now: () => Date) => TaskRepository;

/**
 * Behaviour every TaskRepository must exhibit. Running the same suite against each implementation
 * is what makes them interchangeable behind the DI container.
 */
export function describeTaskRepositoryContract(name: string, createRepository: RepositoryFactory): void {
  describe(`${name} satisfies the TaskRepository contract`, () => {
    const seed = [activeTask({ id: 'task-1' }), completedTask({ id: 'task-2' })];
    let repository: TaskRepository;

    beforeEach(() => {
      repository = createRepository(seed, createTestClock());
    });

    it('lists the existing tasks', async () => {
      const result = await repository.getTasks();

      expect(result.ok && result.value.map((task) => task.id).sort()).toEqual(['task-1', 'task-2']);
    });

    it('creates an active task with normalised fields and returns it from later reads', async () => {
      const created = await repository.createTask({ ...validDraft, title: '  Write release notes ' });
      if (!created.ok) throw new Error(`createTask failed: ${created.error.message}`);

      expect(created.value).toMatchObject({
        title: 'Write release notes',
        status: 'active',
        completedAt: null,
        createdAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      });
      await expect(repository.getTaskById(created.value.id)).resolves.toEqual({ ok: true, value: created.value });
      const list = await repository.getTasks();
      expect(list.ok && list.value).toHaveLength(seed.length + 1);
    });

    it('updates editable fields while preserving identity and creation time', async () => {
      const result = await repository.updateTask('task-1', { ...validDraft, title: 'Renamed', priority: 'high' });

      expect(result.ok && result.value).toMatchObject({
        id: 'task-1',
        title: 'Renamed',
        priority: 'high',
        createdAt: seed[0]?.createdAt,
        updatedAt: FIXED_NOW.toISOString(),
      });
    });

    it('completes and reopens a task with a consistent completion state', async () => {
      const completed = await repository.setTaskCompletion('task-1', true);
      expect(completed.ok && completed.value).toMatchObject({ status: 'completed', completedAt: FIXED_NOW.toISOString() });

      const reopened = await repository.setTaskCompletion('task-1', false);
      expect(reopened.ok && reopened.value).toMatchObject({ status: 'active', completedAt: null });
    });

    it('deletes a task so it can no longer be fetched', async () => {
      await expect(repository.deleteTask('task-2')).resolves.toEqual({ ok: true, value: undefined });

      const lookup = await repository.getTaskById('task-2');
      expect(!lookup.ok && lookup.error.kind).toBe('not_found');
    });

    it('rejects an invalid draft with field errors and stores nothing', async () => {
      const result = await repository.createTask({ ...validDraft, title: '', dueDate: '2026-02-30' });

      expect(result).toEqual({
        ok: false,
        error: expect.objectContaining({
          kind: 'validation',
          fieldErrors: { title: expect.any(String), dueDate: expect.any(String) },
        }),
      });
      const list = await repository.getTasks();
      expect(list.ok && list.value).toHaveLength(seed.length);
    });

    it('reports not_found for a missing task on every single-task operation', async () => {
      const results = await Promise.all([
        repository.getTaskById('missing'),
        repository.updateTask('missing', validDraft),
        repository.setTaskCompletion('missing', true),
        repository.deleteTask('missing'),
      ]);

      expect(results.map((result) => !result.ok && result.error.kind)).toEqual(['not_found', 'not_found', 'not_found', 'not_found']);
    });

    it('rejects a malformed task ID as a validation error', async () => {
      const result = await repository.getTaskById('../../etc');

      expect(!result.ok && result.error.kind).toBe('validation');
    });
  });
}
