import { combineSlices, configureStore } from '@reduxjs/toolkit';

import type { AppDependencies } from '@/core/di/dependencies';
import { authSlice } from '@/features/auth/state/authSlice';
import { tasksSlice } from '@/features/tasks/state/tasksSlice';

const rootReducer = combineSlices(authSlice, tasksSlice);

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Creates a store whose thunks receive the injected dependency container as `extra`.
 * A factory (rather than a module singleton) lets tests build isolated stores with fakes.
 */
export function createAppStore(dependencies: AppDependencies, preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: dependencies } }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
