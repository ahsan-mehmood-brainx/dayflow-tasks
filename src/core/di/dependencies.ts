import { ConfigError, type AppConfig } from '@/config/appConfig';
import { MockAuthService } from '@/features/auth/data/MockAuthService';
import type { AuthService } from '@/features/auth/domain/auth';
import { ApiTaskRepository } from '@/features/tasks/data/ApiTaskRepository';
import { MockTaskRepository } from '@/features/tasks/data/MockTaskRepository';
import { createSeedTasks } from '@/features/tasks/data/seedTasks';
import type { TaskRepository } from '@/features/tasks/domain/TaskRepository';
import { ApiService } from '@/shared/api/ApiService';

/**
 * Everything the application layer is allowed to depend on.
 *
 * The container is built once at the composition root (`src/App.tsx`), provided to React through
 * `DependencyProvider`, and handed to Redux thunks as `extra`. Nothing below the composition root
 * constructs concrete services itself, so swapping an implementation only touches this file.
 */
export interface AppDependencies {
  readonly config: AppConfig;
  /** Present whenever an API base URL is configured, independent of which repository is selected. */
  readonly apiService: ApiService | null;
  readonly taskRepository: TaskRepository;
  /** Always the simulated service: this training project has no real identity provider. */
  readonly authService: AuthService;
}

export function createDependencies(config: AppConfig): AppDependencies {
  const authService = new MockAuthService({ latencyMs: config.mockLatencyMs });
  const apiService =
    config.apiBaseUrl === null
      ? null
      : new ApiService({
          baseUrl: config.apiBaseUrl,
          timeoutMs: config.apiTimeoutMs,
          getHeaders: () => authorizationHeader(authService.getAccessToken()),
        });

  return {
    config,
    apiService,
    taskRepository: createTaskRepository(config, apiService),
    authService,
  };
}

/** Read on every request, so sign-in and sign-out take effect immediately without rebuilding the client. */
function authorizationHeader(token: string | null): Record<string, string> {
  return token === null ? {} : { Authorization: `Bearer ${token}` };
}

function createTaskRepository(config: AppConfig, apiService: ApiService | null): TaskRepository {
  switch (config.repository) {
    case 'mock':
      return new MockTaskRepository({ seed: createSeedTasks(new Date()), latencyMs: config.mockLatencyMs });
    case 'api':
      // parseAppConfig already guarantees a base URL for 'api'; this guards direct callers.
      if (apiService === null) throw new ConfigError('The API repository requires EXPO_PUBLIC_API_BASE_URL.');
      return new ApiTaskRepository(apiService);
  }
}
