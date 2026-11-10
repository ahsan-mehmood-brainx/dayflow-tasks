import type { ActiveTask, CompletedTask, TaskDraft } from '../domain/task';

/** 2 Nov 2026, 09:00 local time. Built from local components so "today" is stable in every time zone. */
export const FIXED_NOW = new Date(2026, 10, 2, 9, 0, 0);
export const FIXED_TODAY = '2026-11-02';

/** A clock that advances one minute per reading, so successive writes get distinct timestamps. */
export function createTestClock(start: Date = FIXED_NOW, stepMs = 60_000): () => Date {
  let current = start.getTime() - stepMs;
  return () => {
    current += stepMs;
    return new Date(current);
  };
}

export const validDraft: TaskDraft = {
  title: 'Write release notes',
  description: 'Summarise the user-facing changes.',
  priority: 'medium',
  dueDate: '2026-11-05',
};

type TaskOverrides = Partial<Omit<ActiveTask, 'status' | 'completedAt'>>;

export function activeTask(overrides: TaskOverrides = {}): ActiveTask {
  return {
    id: 'task-1',
    title: 'Review pull request',
    description: '',
    priority: 'medium',
    dueDate: FIXED_TODAY,
    status: 'active',
    completedAt: null,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
    ...overrides,
  };
}

export function completedTask(overrides: TaskOverrides & { completedAt?: string } = {}): CompletedTask {
  const { completedAt = '2026-11-01T12:00:00.000Z', ...rest } = overrides;
  return { ...activeTask({ updatedAt: completedAt, ...rest }), status: 'completed', completedAt };
}
