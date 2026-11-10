import { createAppAsyncThunk } from '@/core/store/createAppAsyncThunk';
import type { RootState } from '@/core/store/store';
import { selectIsAuthenticated, selectSession } from '@/features/auth/state/authSelectors';
import { cancelledError, type AppError } from '@/shared/lib/appError';
import { err, type Result } from '@/shared/lib/result';

import type { TaskDraft, TaskId } from '../domain/task';

// Task thunks refuse to run without a session, so protected data cannot be fetched or changed even
// if a screen were rendered outside the auth gate.

/**
 * Runs a repository call and reports `cancelled` if the session that started it has ended meanwhile,
 * so a late result after sign-out produces no "success" feedback for a user who has left.
 */
async function withinSession<T>(getState: () => RootState, operation: () => Promise<Result<T, AppError>>): Promise<Result<T, AppError>> {
  const session = selectSession(getState());
  const result = await operation();
  return selectSession(getState()) === session ? result : err(cancelledError());
}

function canMutate(state: RootState, id: TaskId): boolean {
  return selectIsAuthenticated(state) && state.tasks.pendingMutations[id] === undefined;
}

export const fetchTasks = createAppAsyncThunk(
  'tasks/fetchAll',
  async (_: void, { extra, signal, getState, rejectWithValue }) => {
    const result = await withinSession(getState, () => extra.taskRepository.getTasks({ signal }));
    return result.ok ? result.value : rejectWithValue(result.error);
  },
  { condition: (_, { getState }) => selectIsAuthenticated(getState()) && getState().tasks.load.status !== 'loading' },
);

export const createTask = createAppAsyncThunk(
  'tasks/create',
  async (draft: TaskDraft, { extra, signal, getState, rejectWithValue }) => {
    const result = await withinSession(getState, () => extra.taskRepository.createTask(draft, { signal }));
    return result.ok ? result.value : rejectWithValue(result.error);
  },
  // One creation at a time prevents duplicate tasks from repeated taps on Save.
  { condition: (_, { getState }) => selectIsAuthenticated(getState()) && getState().tasks.createRequestId === null },
);

export const updateTask = createAppAsyncThunk(
  'tasks/update',
  async ({ id, draft }: { id: TaskId; draft: TaskDraft }, { extra, signal, getState, rejectWithValue }) => {
    const result = await withinSession(getState, () => extra.taskRepository.updateTask(id, draft, { signal }));
    return result.ok ? result.value : rejectWithValue(result.error);
  },
  { condition: ({ id }, { getState }) => canMutate(getState(), id) },
);

export const setTaskCompletion = createAppAsyncThunk(
  'tasks/setCompletion',
  async ({ id, completed }: { id: TaskId; completed: boolean }, { extra, signal, getState, rejectWithValue }) => {
    const result = await withinSession(getState, () => extra.taskRepository.setTaskCompletion(id, completed, { signal }));
    return result.ok ? result.value : rejectWithValue(result.error);
  },
  { condition: ({ id }, { getState }) => canMutate(getState(), id) },
);

export const deleteTask = createAppAsyncThunk(
  'tasks/delete',
  async (id: TaskId, { extra, signal, getState, rejectWithValue }) => {
    const result = await withinSession(getState, () => extra.taskRepository.deleteTask(id, { signal }));
    // Deleting something that is already gone achieves the user's intent, so it counts as success.
    if (result.ok || result.error.kind === 'not_found') return id;
    return rejectWithValue(result.error);
  },
  { condition: (id, { getState }) => canMutate(getState(), id) },
);
