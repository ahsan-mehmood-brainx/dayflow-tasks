import { createEntityAdapter, createSlice, isAnyOf, type Draft, type PayloadAction } from '@reduxjs/toolkit';

import { signOut } from '@/features/auth/state/authSlice';
import { unexpectedError, type AppError } from '@/shared/lib/appError';

import type { Task, TaskId } from '../domain/task';
import { compareTasks, type TaskQuery, type TaskStatusFilter } from '../domain/taskQueries';

import { createTask, deleteTask, fetchTasks, setTaskCompletion, updateTask } from './tasksThunks';

export type TaskLoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'succeeded' }
  | { readonly status: 'failed'; readonly error: AppError };

export type TaskMutationKind = 'update' | 'completion' | 'delete';

interface PendingMutation {
  readonly kind: TaskMutationKind;
  /** Only the request that started the mutation may settle it; later or stale results are ignored. */
  readonly requestId: string;
}

interface TasksExtraState {
  readonly load: TaskLoadState;
  readonly listRequestId: string | null;
  /**
   * Tasks changed by mutations that completed while the list request was in flight. The server may
   * have produced the list before those changes, so its versions of these tasks are older than ours.
   */
  readonly changedDuringListLoad: Readonly<Record<TaskId, true>>;
  readonly createRequestId: string | null;
  readonly pendingMutations: Readonly<Record<TaskId, PendingMutation>>;
  readonly query: TaskQuery;
}

/** Normalised task storage. The sort comparer keeps `ids` in list order, so selectors never re-sort. */
export const tasksAdapter = createEntityAdapter<Task>({ sortComparer: compareTasks });

const initialState = tasksAdapter.getInitialState<TasksExtraState>({
  load: { status: 'idle' },
  listRequestId: null,
  changedDuringListLoad: {},
  createRequestId: null,
  pendingMutations: {},
  query: { search: '', status: 'all' },
});

export type TasksState = typeof initialState;

/** Clears the pending entry if it belongs to `requestId`. Returns false for stale results. */
function settleMutation(state: Draft<TasksState>, id: TaskId, requestId: string): boolean {
  if (state.pendingMutations[id]?.requestId !== requestId) return false;
  delete state.pendingMutations[id];
  return true;
}

function recordChangeDuringListLoad(state: Draft<TasksState>, id: TaskId): void {
  if (state.listRequestId !== null) state.changedDuringListLoad[id] = true;
}

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    taskSearchChanged(state, action: PayloadAction<string>) {
      state.query.search = action.payload;
    },
    taskStatusFilterChanged(state, action: PayloadAction<TaskStatusFilter>) {
      state.query.status = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state, action) => {
        state.listRequestId = action.meta.requestId;
        state.changedDuringListLoad = {};
        state.load = { status: 'loading' };
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        // Replace everything except tasks we changed after the server built this list.
        const keepLocal = state.changedDuringListLoad;
        const incoming = action.payload.filter((task) => keepLocal[task.id] === undefined);
        const incomingIds = new Set(incoming.map((task) => task.id));
        tasksAdapter.removeMany(state, state.ids.filter((id) => !incomingIds.has(id) && keepLocal[id] === undefined));
        tasksAdapter.setMany(state, incoming);
        state.changedDuringListLoad = {};
        state.load = { status: 'succeeded' };
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listRequestId = null;
        state.changedDuringListLoad = {};
        const error = action.payload ?? unexpectedError();
        state.load = action.meta.aborted || error.kind === 'cancelled' ? { status: 'idle' } : { status: 'failed', error };
      })

      .addCase(createTask.pending, (state, action) => {
        state.createRequestId = action.meta.requestId;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        if (state.createRequestId !== action.meta.requestId) return;
        state.createRequestId = null;
        tasksAdapter.addOne(state, action.payload);
        recordChangeDuringListLoad(state, action.payload.id);
      })
      .addCase(createTask.rejected, (state, action) => {
        if (state.createRequestId === action.meta.requestId) state.createRequestId = null;
      })

      .addCase(updateTask.pending, (state, action) => {
        state.pendingMutations[action.meta.arg.id] = { kind: 'update', requestId: action.meta.requestId };
      })
      .addCase(setTaskCompletion.pending, (state, action) => {
        state.pendingMutations[action.meta.arg.id] = { kind: 'completion', requestId: action.meta.requestId };
      })
      .addCase(deleteTask.pending, (state, action) => {
        state.pendingMutations[action.meta.arg] = { kind: 'delete', requestId: action.meta.requestId };
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        if (!settleMutation(state, action.meta.arg, action.meta.requestId)) return;
        tasksAdapter.removeOne(state, action.meta.arg);
        recordChangeDuringListLoad(state, action.meta.arg);
      })

      .addMatcher(isAnyOf(updateTask.fulfilled, setTaskCompletion.fulfilled), (state, action) => {
        if (!settleMutation(state, action.meta.arg.id, action.meta.requestId)) return;
        tasksAdapter.setOne(state, action.payload);
        recordChangeDuringListLoad(state, action.meta.arg.id);
      })
      .addMatcher(isAnyOf(updateTask.rejected, setTaskCompletion.rejected, deleteTask.rejected), (state, action) => {
        const id = typeof action.meta.arg === 'string' ? action.meta.arg : action.meta.arg.id;
        if (!settleMutation(state, id, action.meta.requestId)) return;
        // The repository says the task no longer exists, so stop showing it.
        if (action.payload?.kind === 'not_found') {
          tasksAdapter.removeOne(state, id);
          recordChangeDuringListLoad(state, id);
        }
      })
      // Signing out discards the user's data and every in-flight request's claim on the state.
      .addMatcher(isAnyOf(signOut.fulfilled, signOut.rejected), () => initialState);
  },
});

export const { taskSearchChanged, taskStatusFilterChanged } = tasksSlice.actions;
