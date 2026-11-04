import { createTestStore, demoCredentials } from '@/core/testing/createTestStore';
import { MockAuthService } from '@/features/auth/data/MockAuthService';
import { fetchTasks } from '@/features/tasks/state/tasksThunks';
import { selectTaskCount } from '@/features/tasks/state/tasksSelectors';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';
import { activeTask } from '@/features/tasks/testing/taskFixtures';
import type { AppStore } from '@/core/store/store';

import { selectCurrentUser, selectIsAuthenticated, selectSignInError } from '../authSelectors';
import { signIn, signInErrorDismissed, signOut } from '../authSlice';

function recordStatuses(store: AppStore): string[] {
  const statuses = [store.getState().auth.status];
  store.subscribe(() => {
    const status = store.getState().auth.status;
    if (statuses.at(-1) !== status) statuses.push(status);
  });
  return statuses;
}

describe('auth state', () => {
  it('moves from signed out through signing in to signed in', async () => {
    const store = createTestStore();
    const statuses = recordStatuses(store);

    await store.dispatch(signIn(demoCredentials));

    expect(statuses).toEqual(['signedOut', 'signingIn', 'signedIn']);
    expect(selectIsAuthenticated(store.getState())).toBe(true);
    expect(selectCurrentUser(store.getState())?.email).toBe(demoCredentials.email);
  });

  it('returns to signed out with a displayable error when credentials are rejected', async () => {
    const store = createTestStore();

    await store.dispatch(signIn({ ...demoCredentials, password: 'wrong' }));

    expect(selectIsAuthenticated(store.getState())).toBe(false);
    expect(selectSignInError(store.getState())).toMatchObject({ kind: 'unauthorized', message: expect.any(String) });

    store.dispatch(signInErrorDismissed());
    expect(selectSignInError(store.getState())).toBeNull();
  });

  it('ignores a second sign-in while one is already in progress', async () => {
    const authService = new MockAuthService();
    const signInSpy = jest.spyOn(authService, 'signIn');
    const store = createTestStore({ authService });

    await Promise.all([store.dispatch(signIn(demoCredentials)), store.dispatch(signIn(demoCredentials))]);

    expect(signInSpy).toHaveBeenCalledTimes(1);
  });

  it('signing out ends the session and discards the user’s task data', async () => {
    const store = createTestStore({ taskRepository: new MockTaskRepository({ seed: [activeTask()] }) });
    await store.dispatch(signIn(demoCredentials));
    await store.dispatch(fetchTasks());
    expect(selectTaskCount(store.getState())).toBe(1);
    const statuses = recordStatuses(store);

    await store.dispatch(signOut());

    expect(statuses).toEqual(['signedIn', 'signingOut', 'signedOut']);
    expect(selectCurrentUser(store.getState())).toBeNull();
    expect(selectTaskCount(store.getState())).toBe(0);
    expect(store.getState().tasks.load.status).toBe('idle');
  });

  it('still signs out locally when the auth service fails', async () => {
    const authService = new MockAuthService();
    jest.spyOn(authService, 'signOut').mockRejectedValueOnce(new Error('Service unavailable'));
    const store = createTestStore({ authService });
    await store.dispatch(signIn(demoCredentials));

    await store.dispatch(signOut());

    expect(selectIsAuthenticated(store.getState())).toBe(false);
  });
});
