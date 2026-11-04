import { getTaskTimeframe, validateTaskDraft } from '../../domain/taskRules';
import { describeTaskRepositoryContract } from '../../testing/taskRepositoryContract';
import { FIXED_NOW, FIXED_TODAY, validDraft } from '../../testing/taskFixtures';
import { MockTaskRepository } from '../MockTaskRepository';
import { createSeedTasks } from '../seedTasks';

let nextId = 0;
const createId = () => `created-${(nextId += 1)}`;

describeTaskRepositoryContract('MockTaskRepository', (seed, now) => new MockTaskRepository({ seed, now, createId }));

describe('MockTaskRepository', () => {
  it('honours cancellation during simulated latency without applying the write', async () => {
    const repository = new MockTaskRepository({ latencyMs: 50 });
    const controller = new AbortController();

    const pending = repository.createTask(validDraft, { signal: controller.signal });
    controller.abort();

    await expect(pending).resolves.toEqual({ ok: false, error: expect.objectContaining({ kind: 'cancelled' }) });
    const list = await repository.getTasks();
    expect(list.ok && list.value).toHaveLength(0);
  });

  it('keeps separate instances isolated from each other', async () => {
    const first = new MockTaskRepository();
    const second = new MockTaskRepository();

    await first.createTask(validDraft);

    const list = await second.getTasks();
    expect(list.ok && list.value).toHaveLength(0);
  });
});

describe('createSeedTasks', () => {
  const seed = createSeedTasks(FIXED_NOW);

  it('produces valid tasks with unique IDs', () => {
    expect(new Set(seed.map((task) => task.id)).size).toBe(seed.length);
    for (const task of seed) {
      expect(validateTaskDraft(task).ok).toBe(true);
    }
  });

  it('covers every timeframe so the demo shows each visual state', () => {
    const timeframes = new Set(seed.map((task) => getTaskTimeframe(task, FIXED_TODAY)));

    expect([...timeframes].sort()).toEqual(['completed', 'overdue', 'today', 'unscheduled', 'upcoming']);
  });
});
