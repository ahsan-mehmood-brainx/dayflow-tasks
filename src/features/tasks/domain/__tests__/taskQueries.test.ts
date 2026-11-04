import { activeTask, completedTask, FIXED_NOW, FIXED_TODAY } from '../../testing/taskFixtures';
import { buildTaskOverview, compareTasks, matchesTaskQuery } from '../taskQueries';

const overdue = activeTask({ id: 'overdue', priority: 'high', dueDate: '2026-11-01' });
const todayLow = activeTask({ id: 'today-low', priority: 'low', dueDate: FIXED_TODAY });
const todayHigh = activeTask({ id: 'today-high', priority: 'high', dueDate: FIXED_TODAY });
const upcoming = activeTask({ id: 'upcoming', dueDate: '2026-11-05' });
const unscheduled = activeTask({ id: 'unscheduled', dueDate: null });
const doneToday = completedTask({ id: 'done-today', completedAt: FIXED_NOW.toISOString() });
const doneEarlier = completedTask({ id: 'done-earlier', completedAt: '2026-10-30T10:00:00.000Z' });

const ordered = [overdue, todayHigh, todayLow, upcoming, unscheduled, doneToday, doneEarlier];

describe('compareTasks', () => {
  it('orders active work by due date then priority, unscheduled last, then recently completed', () => {
    const shuffled = [doneEarlier, unscheduled, todayLow, doneToday, upcoming, overdue, todayHigh];

    expect(shuffled.sort(compareTasks).map((task) => task.id)).toEqual(ordered.map((task) => task.id));
  });
});

describe('matchesTaskQuery', () => {
  const task = activeTask({ title: 'Renew car insurance', description: 'Compare two quotes' });

  it.each([
    [{ search: '', status: 'all' as const }, true],
    [{ search: 'INSUR', status: 'all' as const }, true],
    [{ search: '  quotes ', status: 'active' as const }, true],
    [{ search: 'dentist', status: 'all' as const }, false],
    [{ search: '', status: 'completed' as const }, false],
  ])('matches %o → %s', (query, expected) => {
    expect(matchesTaskQuery(task, query)).toBe(expected);
  });
});

describe('buildTaskOverview', () => {
  it('groups today’s focus and upcoming work and counts progress for the local day', () => {
    const overview = buildTaskOverview(ordered, FIXED_TODAY);

    expect(overview.focus.map((task) => task.id)).toEqual(['overdue', 'today-high', 'today-low']);
    expect(overview.upcoming.map((task) => task.id)).toEqual(['upcoming']);
    expect(overview.counts).toEqual({ overdue: 1, dueToday: 2, completedToday: 1, active: 5 });
  });

  it('returns empty groups for a new user', () => {
    expect(buildTaskOverview([], FIXED_TODAY)).toEqual({
      focus: [],
      upcoming: [],
      counts: { overdue: 0, dueToday: 0, completedToday: 0, active: 0 },
    });
  });
});
