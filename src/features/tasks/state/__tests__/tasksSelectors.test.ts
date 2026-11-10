import { createTestStore, signedInState } from '@/core/testing/createTestStore';
import { signInErrorDismissed } from '@/features/auth/state/authSlice';

import { MockTaskRepository } from '../../data/MockTaskRepository';
import { activeTask, completedTask, FIXED_NOW, FIXED_TODAY } from '../../testing/taskFixtures';
import { selectTaskOverview, selectVisibleTasks } from '../tasksSelectors';
import { taskSearchChanged, taskStatusFilterChanged } from '../tasksSlice';
import { fetchTasks } from '../tasksThunks';

async function loadedStore() {
  const seed = [
    activeTask({ id: 'invoice', title: 'Send invoice', dueDate: '2026-11-01' }),
    activeTask({ id: 'slides', title: 'Prepare slides', dueDate: '2026-11-04' }),
    completedTask({ id: 'readme', title: 'Update README', completedAt: FIXED_NOW.toISOString() }),
  ];
  const store = createTestStore({ taskRepository: new MockTaskRepository({ seed }) }, signedInState);
  await store.dispatch(fetchTasks());
  return store;
}

describe('selectVisibleTasks', () => {
  it('applies the status filter and search from shared state', async () => {
    const store = await loadedStore();
    const visibleIds = () => selectVisibleTasks(store.getState()).map((task) => task.id);

    expect(visibleIds()).toEqual(['invoice', 'slides', 'readme']);

    store.dispatch(taskStatusFilterChanged('active'));
    expect(visibleIds()).toEqual(['invoice', 'slides']);

    store.dispatch(taskSearchChanged('slides'));
    expect(visibleIds()).toEqual(['slides']);

    store.dispatch(taskStatusFilterChanged('completed'));
    expect(visibleIds()).toEqual([]);
  });

  it('returns the same array while tasks and query are unchanged, so lists do not re-render', async () => {
    const store = await loadedStore();
    const first = selectVisibleTasks(store.getState());

    store.dispatch(signInErrorDismissed()); // An unrelated action produces a new root state.

    expect(selectVisibleTasks(store.getState())).toBe(first);
  });
});

describe('selectTaskOverview', () => {
  it('derives the Home summary for the given day', async () => {
    const store = await loadedStore();

    const overview = selectTaskOverview(store.getState(), FIXED_TODAY);

    expect(overview.focus.map((task) => task.id)).toEqual(['invoice']);
    expect(overview.upcoming.map((task) => task.id)).toEqual(['slides']);
    expect(overview.counts).toEqual({ overdue: 1, dueToday: 0, completedToday: 1, active: 2 });
    expect(selectTaskOverview(store.getState(), FIXED_TODAY)).toBe(overview);
  });
});
