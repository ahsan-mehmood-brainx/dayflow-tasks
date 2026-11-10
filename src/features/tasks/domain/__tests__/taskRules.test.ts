import { activeTask, completedTask, FIXED_NOW, FIXED_TODAY, validDraft } from '../../testing/taskFixtures';
import {
  buildTask,
  changeTaskCompletion,
  DESCRIPTION_MAX_LENGTH,
  getTaskTimeframe,
  isValidTaskId,
  reviseTask,
  TITLE_MAX_LENGTH,
  validateTaskDraft,
} from '../taskRules';

const LATER = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000);

describe('validateTaskDraft', () => {
  it('accepts a valid draft and trims text fields', () => {
    const result = validateTaskDraft({ ...validDraft, title: '  Ship it  ', description: '  Today.  ' });

    expect(result).toEqual({ ok: true, value: { ...validDraft, title: 'Ship it', description: 'Today.' } });
  });

  it('accepts a draft without a due date', () => {
    expect(validateTaskDraft({ ...validDraft, dueDate: null }).ok).toBe(true);
  });

  it.each(['', '    '])('rejects an empty title (%j)', (title) => {
    expect(validateTaskDraft({ ...validDraft, title })).toEqual({ ok: false, error: { title: 'Enter a title.' } });
  });

  it('enforces the title length limit at the boundary', () => {
    expect(validateTaskDraft({ ...validDraft, title: 'a'.repeat(TITLE_MAX_LENGTH) }).ok).toBe(true);
    expect(validateTaskDraft({ ...validDraft, title: 'a'.repeat(TITLE_MAX_LENGTH + 1) }).ok).toBe(false);
  });

  it('reports every invalid field at once', () => {
    const result = validateTaskDraft({
      ...validDraft,
      title: '',
      description: 'x'.repeat(DESCRIPTION_MAX_LENGTH + 1),
      dueDate: '2026-02-30',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.error).sort()).toEqual(['description', 'dueDate', 'title']);
  });
});

describe('buildTask', () => {
  it('creates an active task with matching creation and update timestamps', () => {
    const result = buildTask(validDraft, 'task-42', FIXED_NOW);

    expect(result).toEqual({
      ok: true,
      value: {
        ...validDraft,
        id: 'task-42',
        status: 'active',
        completedAt: null,
        createdAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      },
    });
  });

  it('refuses to build a task from an invalid draft', () => {
    expect(buildTask({ ...validDraft, title: ' ' }, 'task-42', FIXED_NOW).ok).toBe(false);
  });
});

describe('reviseTask', () => {
  it('preserves identity, creation time and completion state', () => {
    const original = completedTask({ id: 'task-7' });
    const result = reviseTask(original, { ...validDraft, title: 'Renamed' }, LATER);

    expect(result.ok && result.value).toMatchObject({
      id: 'task-7',
      title: 'Renamed',
      createdAt: original.createdAt,
      status: 'completed',
      completedAt: original.completedAt,
      updatedAt: LATER.toISOString(),
    });
  });
});

describe('changeTaskCompletion', () => {
  it('completing records when it happened', () => {
    const task = changeTaskCompletion(activeTask(), true, LATER);

    expect(task).toMatchObject({ status: 'completed', completedAt: LATER.toISOString(), updatedAt: LATER.toISOString() });
  });

  it('reopening clears the completion time', () => {
    const task = changeTaskCompletion(completedTask(), false, LATER);

    expect(task).toMatchObject({ status: 'active', completedAt: null, updatedAt: LATER.toISOString() });
  });

  it('is a no-op when the task is already in the requested state', () => {
    const task = activeTask();

    expect(changeTaskCompletion(task, false, LATER)).toBe(task);
  });
});

describe('getTaskTimeframe', () => {
  it.each([
    [activeTask({ dueDate: '2026-11-01' }), 'overdue'],
    [activeTask({ dueDate: FIXED_TODAY }), 'today'],
    [activeTask({ dueDate: '2026-11-03' }), 'upcoming'],
    [activeTask({ dueDate: null }), 'unscheduled'],
    [completedTask({ dueDate: '2026-10-01' }), 'completed'],
  ])('classifies %o as %s', (task, expected) => {
    expect(getTaskTimeframe(task, FIXED_TODAY)).toBe(expected);
  });
});

describe('isValidTaskId', () => {
  it.each([
    ['task-1', true],
    ['mock-lx2k9-1a', true],
    ['', false],
    ['../tasks', false],
    ['a'.repeat(65), false],
  ])('isValidTaskId(%j) is %s', (id, expected) => {
    expect(isValidTaskId(id)).toBe(expected);
  });
});
