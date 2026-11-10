import { createAsyncThunk } from '@reduxjs/toolkit';

import type { AppDependencies } from '@/core/di/dependencies';
import type { AppError } from '@/shared/lib/appError';

import type { AppDispatch, RootState } from './store';

/**
 * Typed thunk creator. `extra` is the injected dependency container and every thunk rejects with an
 * `AppError`, so reducers and callers handle one error shape.
 *
 * Lives apart from `store.ts` so slice modules can import it without a runtime import cycle.
 */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  extra: AppDependencies;
  rejectValue: AppError;
}>();
