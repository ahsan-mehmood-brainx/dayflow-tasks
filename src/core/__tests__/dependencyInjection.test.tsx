import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { parseAppConfig } from '@/config/appConfig';
import { DEMO_ACCOUNT } from '@/config/demoAccount';
import { createDependencies } from '@/core/di/dependencies';
import { DependencyProvider, useDependencies } from '@/core/di/DependencyProvider';
import { useAppDispatch } from '@/core/store/hooks';
import { createAppAsyncThunk } from '@/core/store/createAppAsyncThunk';
import { StoreProvider } from '@/core/store/StoreProvider';
import { ApiTaskRepository } from '@/features/tasks/data/ApiTaskRepository';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';
import { ApiService } from '@/shared/api/ApiService';

const readInjectedRepositoryKind = createAppAsyncThunk('test/readInjectedRepositoryKind', (_: void, { extra }) =>
  Promise.resolve(extra.config.repository),
);

describe('createDependencies', () => {
  it('provides the mock repository by default, without an API client', () => {
    const dependencies = createDependencies(parseAppConfig({}));

    expect(dependencies.taskRepository).toBeInstanceOf(MockTaskRepository);
    expect(dependencies.apiService).toBeNull();
  });

  it('provides the API repository when configured, with no other code changes', () => {
    const dependencies = createDependencies(
      parseAppConfig({ EXPO_PUBLIC_TASK_REPOSITORY: 'api', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.test' }),
    );

    expect(dependencies.taskRepository).toBeInstanceOf(ApiTaskRepository);
    expect(dependencies.apiService).toBeInstanceOf(ApiService);
  });

  it('authenticates API requests with the current session token, and only while signed in', async () => {
    const fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '[]' }) as unknown as Response);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;
    try {
      const { apiService, authService, taskRepository } = createDependencies(
        parseAppConfig({ EXPO_PUBLIC_TASK_REPOSITORY: 'api', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.test' }),
      );
      expect(apiService).not.toBeNull();
      const sentHeaders = () => (fetchSpy.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers;

      await taskRepository.getTasks();
      expect(sentHeaders()).not.toHaveProperty('Authorization');

      await authService.signIn({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
      await taskRepository.getTasks();
      expect(sentHeaders()).toHaveProperty('Authorization', `Bearer ${authService.getAccessToken() ?? ''}`);

      await authService.signOut();
      await taskRepository.getTasks();
      expect(sentHeaders()).not.toHaveProperty('Authorization');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('dependency injection', () => {
  it('hands the container provided through React Context to Redux thunks', async () => {
    const dependencies = createDependencies(
      parseAppConfig({ EXPO_PUBLIC_TASK_REPOSITORY: 'api', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.test' }),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DependencyProvider dependencies={dependencies}>
        <StoreProvider>{children}</StoreProvider>
      </DependencyProvider>
    );

    const { result } = await renderHook(() => ({ dispatch: useAppDispatch(), injected: useDependencies() }), { wrapper });

    expect(result.current.injected).toBe(dependencies);
    await expect(result.current.dispatch(readInjectedRepositoryKind()).unwrap()).resolves.toBe('api');
  });

  it('fails loudly when a consumer is rendered outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useDependencies())).rejects.toThrow(/within a DependencyProvider/);
  });
});
