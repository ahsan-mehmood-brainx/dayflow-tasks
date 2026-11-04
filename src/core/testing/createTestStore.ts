import { parseAppConfig } from '@/config/appConfig';
import { DEMO_ACCOUNT } from '@/config/demoAccount';
import type { AppDependencies } from '@/core/di/dependencies';
import { createAppStore, type AppStore, type RootState } from '@/core/store/store';
import { MockAuthService } from '@/features/auth/data/MockAuthService';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';

/** Real implementations with no latency; override any dependency with a fake or spy. */
export function createTestDependencies(overrides: Partial<AppDependencies> = {}): AppDependencies {
  return {
    config: parseAppConfig({ EXPO_PUBLIC_MOCK_LATENCY_MS: '0' }),
    apiService: null,
    taskRepository: new MockTaskRepository(),
    authService: new MockAuthService(),
    ...overrides,
  };
}

export function createTestStore(overrides: Partial<AppDependencies> = {}, preloadedState?: Partial<RootState>): AppStore {
  return createAppStore(createTestDependencies(overrides), preloadedState);
}

export const signedInState: Pick<RootState, 'auth'> = {
  auth: { status: 'signedIn', session: { user: { ...DEMO_ACCOUNT.user }, startedAt: '2026-11-02T08:00:00.000Z' } },
};

export const demoCredentials = { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password };
