/**
 * Runtime configuration for the app, resolved once at the composition root.
 *
 * Values come from `EXPO_PUBLIC_*` environment variables (see `.env.example`).
 * They are inlined into the bundle at build time, so they must never hold secrets.
 */

export type RepositoryKind = 'mock' | 'api';

export interface AppConfig {
  /** Which TaskRepository implementation the dependency container provides. */
  readonly repository: RepositoryKind;
  /** Base URL for the HTTP API. Required when `repository` is `'api'`. */
  readonly apiBaseUrl: string | null;
  readonly apiTimeoutMs: number;
  /** Artificial latency for the mock repository so loading states are visible in the demo. */
  readonly mockLatencyMs: number;
}

export interface AppEnvironment {
  readonly EXPO_PUBLIC_TASK_REPOSITORY?: string;
  readonly EXPO_PUBLIC_API_BASE_URL?: string;
  readonly EXPO_PUBLIC_API_TIMEOUT_MS?: string;
  readonly EXPO_PUBLIC_MOCK_LATENCY_MS?: string;
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

const DEFAULT_API_TIMEOUT_MS = 10_000;
const DEFAULT_MOCK_LATENCY_MS = 350;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s/?#]+[^\s]*$/i;
/** Hosts where cleartext http is acceptable: loopback, the Android emulator host, LAN and .local names. */
const DEV_HOST_PATTERN =
  /^(localhost|127(\.\d{1,3}){3}|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[^.]+\.local)$/i;

function isCleartextAllowed(url: string): boolean {
  const authority = url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0] ?? '';
  const host = authority.slice(authority.lastIndexOf('@') + 1).replace(/:\d*$/, '');
  return DEV_HOST_PATTERN.test(host);
}

function parseRepositoryKind(value: string | undefined): RepositoryKind {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'mock') return 'mock';
  if (normalized === 'api') return 'api';
  throw new ConfigError(`EXPO_PUBLIC_TASK_REPOSITORY must be "mock" or "api" (received "${value}").`);
}

function parseBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!HTTP_URL_PATTERN.test(trimmed)) {
    throw new ConfigError(`EXPO_PUBLIC_API_BASE_URL must be an http(s) URL (received "${value}").`);
  }
  if (/^http:/i.test(trimmed) && !isCleartextAllowed(trimmed)) {
    throw new ConfigError(`EXPO_PUBLIC_API_BASE_URL must use https unless it targets localhost or a local network host (received "${value}").`);
  }
  return trimmed.replace(/\/+$/, '');
}

function parseNonNegativeInteger(name: string, value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (!/^\d+$/.test(trimmed)) {
    throw new ConfigError(`${name} must be a non-negative integer (received "${value}").`);
  }
  return Number(trimmed);
}

export function parseAppConfig(env: AppEnvironment): AppConfig {
  const repository = parseRepositoryKind(env.EXPO_PUBLIC_TASK_REPOSITORY);
  const apiBaseUrl = parseBaseUrl(env.EXPO_PUBLIC_API_BASE_URL);

  if (repository === 'api' && apiBaseUrl === null) {
    throw new ConfigError('EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_TASK_REPOSITORY is "api".');
  }

  const apiTimeoutMs = parseNonNegativeInteger('EXPO_PUBLIC_API_TIMEOUT_MS', env.EXPO_PUBLIC_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS);
  if (apiTimeoutMs === 0) {
    throw new ConfigError('EXPO_PUBLIC_API_TIMEOUT_MS must be greater than zero.');
  }

  return {
    repository,
    apiBaseUrl,
    apiTimeoutMs,
    mockLatencyMs: parseNonNegativeInteger('EXPO_PUBLIC_MOCK_LATENCY_MS', env.EXPO_PUBLIC_MOCK_LATENCY_MS, DEFAULT_MOCK_LATENCY_MS),
  };
}

/**
 * Reads configuration from the build environment.
 * Each variable is referenced statically because Expo only inlines `process.env.EXPO_PUBLIC_*`
 * member expressions; destructuring or bracket access would silently yield `undefined`.
 */
export function readAppConfig(): AppConfig {
  return parseAppConfig({
    EXPO_PUBLIC_TASK_REPOSITORY: process.env.EXPO_PUBLIC_TASK_REPOSITORY,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_API_TIMEOUT_MS: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,
    EXPO_PUBLIC_MOCK_LATENCY_MS: process.env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  });
}
