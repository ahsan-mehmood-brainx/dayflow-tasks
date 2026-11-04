import { activeTask, completedTask, FIXED_TODAY } from '../../testing/taskFixtures';
import { describeTaskForAccessibility, formatDueDate, formatTimestamp, greetingFor, PRIORITY_LABELS } from '../formatting';

describe('formatDueDate', () => {
  it('uses relative words for yesterday, today and tomorrow', () => {
    expect(formatDueDate('2026-11-02', FIXED_TODAY)).toBe('Today');
    expect(formatDueDate('2026-11-03', FIXED_TODAY)).toBe('Tomorrow');
    expect(formatDueDate('2026-11-01', FIXED_TODAY)).toBe('Yesterday');
  });

  it('handles month and year boundaries', () => {
    expect(formatDueDate('2026-12-01', '2026-11-30')).toBe('Tomorrow');
    expect(formatDueDate('2027-01-01', '2026-12-31')).toBe('Tomorrow');
    expect(formatDueDate('2026-12-31', '2027-01-01')).toBe('Yesterday');
  });

  it('shows a short date without the year inside the current year', () => {
    const text = formatDueDate('2026-11-20', FIXED_TODAY);
    expect(text).toContain('20');
    expect(text).not.toContain('2026');
  });

  it('includes the year when the date is in another year', () => {
    expect(formatDueDate('2027-03-09', FIXED_TODAY)).toContain('2027');
    expect(formatDueDate('2025-03-09', FIXED_TODAY)).toContain('2025');
  });

  it('falls back to the raw value for an impossible date', () => {
    expect(formatDueDate('2026-02-30', FIXED_TODAY)).toBe('2026-02-30');
  });
});

describe('formatTimestamp', () => {
  it('renders date and time', () => {
    const text = formatTimestamp('2026-11-02T09:30:00.000Z');
    expect(text).toContain('2026');
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('greetingFor', () => {
  it.each([
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good afternoon'],
    [18, 'Good evening'],
    [23, 'Good evening'],
  ])('at %i:00 says "%s"', (hour, greeting) => {
    expect(greetingFor(new Date(2026, 10, 2, hour, 0))).toBe(greeting);
  });
});

describe('describeTaskForAccessibility', () => {
  it('reads an upcoming task with its due date and priority', () => {
    const task = activeTask({ title: 'Pay rent', dueDate: '2026-11-03', priority: 'high' });
    expect(describeTaskForAccessibility(task, FIXED_TODAY)).toBe('Pay rent. Due Tomorrow. High priority.');
  });

  it('calls out overdue tasks in words', () => {
    const task = activeTask({ title: 'Pay rent', dueDate: '2026-11-01', priority: 'high' });
    expect(describeTaskForAccessibility(task, FIXED_TODAY)).toBe('Pay rent. Overdue, was due Yesterday. High priority.');
  });

  it('says when there is no due date', () => {
    const task = activeTask({ title: 'Someday', dueDate: null, priority: 'low' });
    expect(describeTaskForAccessibility(task, FIXED_TODAY)).toBe('Someday. No due date. Low priority.');
  });

  it('reports completed tasks as completed, never overdue', () => {
    const task = completedTask({ title: 'Done thing', dueDate: '2026-10-01' });
    const text = describeTaskForAccessibility(task, FIXED_TODAY);
    expect(text).toContain('Completed');
    expect(text).not.toContain('Overdue');
  });

  it('has a label for every priority', () => {
    expect(PRIORITY_LABELS).toEqual({ high: 'High', medium: 'Medium', low: 'Low' });
  });
});
