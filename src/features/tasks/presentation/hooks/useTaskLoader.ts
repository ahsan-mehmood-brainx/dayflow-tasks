import { useCallback, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/core/store/hooks';

import { selectTaskCount, selectTaskLoad } from '../../state/tasksSelectors';
import { fetchTasks } from '../../state/tasksThunks';

/**
 * Loads tasks the first time a screen needs them and exposes refresh/retry. Safe to use from several
 * screens at once: the thunk's condition collapses concurrent loads into one request.
 */
export function useTaskLoader() {
  const dispatch = useAppDispatch();
  const load = useAppSelector(selectTaskLoad);
  const hasTasks = useAppSelector(selectTaskCount) > 0;

  useEffect(() => {
    if (load.status === 'idle') void dispatch(fetchTasks());
  }, [dispatch, load.status]);

  const reload = useCallback(() => {
    void dispatch(fetchTasks());
  }, [dispatch]);

  return {
    load,
    hasTasks,
    reload,
    /** A background refresh of an already-populated list (drives pull-to-refresh). */
    isRefreshing: load.status === 'loading' && hasTasks,
    /** Nothing to show yet: render a full-screen loading state. */
    isInitialLoading: (load.status === 'idle' || load.status === 'loading') && !hasTasks,
  };
}
