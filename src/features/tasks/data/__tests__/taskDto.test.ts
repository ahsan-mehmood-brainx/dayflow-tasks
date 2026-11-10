import { decodeTask, decodeTaskList, toTaskWriteDto } from '../taskDto';

const validDto = {
  id: 'task-1',
  title: 'Write tests',
  description: 'All of them',
  priority: 'high',
  is_completed: false,
  due_date: '2026-11-05',
  created_at: '2026-11-01T08:00:00.000Z',
  updated_at: '2026-11-01T09:00:00.000Z',
  completed_at: null,
};

describe('toTaskWriteDto', () => {
  it('maps a draft to the snake_case wire format', () => {
    expect(toTaskWriteDto({ title: 'A', description: 'B', priority: 'low', dueDate: '2026-11-05' })).toEqual({
      title: 'A',
      description: 'B',
      priority: 'low',
      due_date: '2026-11-05',
    });
  });

  it('sends an empty description as null', () => {
    expect(toTaskWriteDto({ title: 'A', description: '', priority: 'low', dueDate: null })).toMatchObject({
      description: null,
      due_date: null,
    });
  });
});

describe('decodeTask', () => {
  it('decodes an active task', () => {
    expect(decodeTask(validDto)).toEqual({
      ok: true,
      value: {
        id: 'task-1',
        title: 'Write tests',
        description: 'All of them',
        priority: 'high',
        dueDate: '2026-11-05',
        status: 'active',
        completedAt: null,
        createdAt: '2026-11-01T08:00:00.000Z',
        updatedAt: '2026-11-01T09:00:00.000Z',
      },
    });
  });

  it('decodes a completed task with its completion time', () => {
    const result = decodeTask({ ...validDto, is_completed: true, completed_at: '2026-11-01T10:00:00.000Z' });
    expect(result).toMatchObject({ ok: true, value: { status: 'completed', completedAt: '2026-11-01T10:00:00.000Z' } });
  });

  it('falls back to updated_at when a completed record lacks completed_at', () => {
    const result = decodeTask({ ...validDto, is_completed: true, completed_at: null });
    expect(result).toMatchObject({ ok: true, value: { status: 'completed', completedAt: validDto.updated_at } });
  });

  it('treats a null or missing description and due date as empty', () => {
    const { description: _d, due_date: _due, ...rest } = validDto;
    expect(decodeTask({ ...rest })).toMatchObject({ ok: true, value: { description: '', dueDate: null } });
    expect(decodeTask({ ...validDto, description: null, due_date: null })).toMatchObject({
      ok: true,
      value: { description: '', dueDate: null },
    });
  });

  it.each([
    ['a non-object', 'nope'],
    ['an array', []],
    ['null', null],
    ['a missing id', { ...validDto, id: undefined }],
    ['a non-string title', { ...validDto, title: 7 }],
    ['a non-string description', { ...validDto, description: 7 }],
    ['an unknown priority', { ...validDto, priority: 'urgent' }],
    ['a non-boolean is_completed', { ...validDto, is_completed: 'yes' }],
    ['a malformed due date', { ...validDto, due_date: '05/11/2026' }],
    ['an impossible due date', { ...validDto, due_date: '2026-02-30' }],
    ['a malformed created_at', { ...validDto, created_at: 'yesterday' }],
    ['a malformed updated_at', { ...validDto, updated_at: 12 }],
    ['a malformed completed_at', { ...validDto, is_completed: true, completed_at: 'later' }],
  ])('rejects %s', (_label, input) => {
    const result = decodeTask(input);
    expect(result.ok).toBe(false);
  });

  it('names the offending task id in field errors', () => {
    const result = decodeTask({ ...validDto, priority: 'urgent' });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('task-1') });
  });
});

describe('decodeTaskList', () => {
  it('decodes every item', () => {
    const result = decodeTaskList([validDto, { ...validDto, id: 'task-2' }]);
    expect(result.ok && result.value.map((task) => task.id)).toEqual(['task-1', 'task-2']);
  });

  it('decodes an empty list', () => {
    expect(decodeTaskList([])).toEqual({ ok: true, value: [] });
  });

  it('rejects a non-array response', () => {
    expect(decodeTaskList({ tasks: [] }).ok).toBe(false);
  });

  it('fails the whole list and reports the index of the first bad item', () => {
    const result = decodeTaskList([validDto, { ...validDto, id: 'task-2', priority: 'nope' }]);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/^tasks\[1\]:/) });
  });
});
