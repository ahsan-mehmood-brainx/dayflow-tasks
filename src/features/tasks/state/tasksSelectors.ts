import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@/core/store/store';
import type { CalendarDate } from '@/shared/lib/calendarDate';

import type { TaskId } from '../domain/task';
import { buildTaskOverview, matchesTaskQuery } from '../domain/taskQueries';

import { tasksAdapter, type TaskMutationKind } from './tasksSlice';

const adapterSelectors = tasksAdapter.getSelectors((state: RootState) => state.tasks);

/** All tasks in canonical list order. */
export const selectAllTasks = adapterSelectors.selectAll;
export const selectTaskById = adapterSelectors.selectById;
export const selectTaskCount = adapterSelectors.selectTotal;

export const selectTaskLoad = (state: RootState) => state.tasks.load;
export const selectTaskQuery = (state: RootState) => state.tasks.query;
export const selectIsCreatingTask = (state: RootState) => state.tasks.createRequestId !== null;

export function selectTaskMutation(state: RootState, id: TaskId): TaskMutationKind | null {
  return state.tasks.pendingMutations[id]?.kind ?? null;
}

/** Tasks matching the current search and status filter. Recomputed only when tasks or query change. */
export const selectVisibleTasks = createSelector([selectAllTasks, selectTaskQuery], (tasks, query) =>
  tasks.filter((task) => matchesTaskQuery(task, query)),
);

/** Home dashboard data for the given local day. */
export const selectTaskOverview = createSelector(
  [selectAllTasks, (_state: RootState, today: CalendarDate) => today],
  (tasks, today) => buildTaskOverview(tasks, today),
);
