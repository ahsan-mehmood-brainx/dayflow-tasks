import { ConfigError, parseAppConfig } from '../appConfig';

describe('parseAppConfig', () => {
  it('defaults to the mock repository with sensible timings when nothing is set', () => {
    expect(parseAppConfig({})).toEqual({
      repository: 'mock',
      apiBaseUrl: null,
      apiTimeoutMs: 10_000,
      mockLatencyMs: 350,
    });
  });

  it('selects the API repository and normalises the base URL', () => {
    const config = parseAppConfig({
      EXPO_PUBLIC_TASK_REPOSITORY: ' API ',
      EXPO_PUBLIC_API_BASE_URL: 'https://api.example.test/v1//',
      EXPO_PUBLIC_API_TIMEOUT_MS: '5000',
      EXPO_PUBLIC_MOCK_LATENCY_MS: '0',
    });

    expect(config).toEqual({
      repository: 'api',
      apiBaseUrl: 'https://api.example.test/v1',
      apiTimeoutMs: 5000,
      mockLatencyMs: 0,
    });
  });

  it('requires a base URL when the API repository is selected', () => {
    expect(() => parseAppConfig({ EXPO_PUBLIC_TASK_REPOSITORY: 'api' })).toThrow(ConfigError);
  });

  it.each([
    [{ EXPO_PUBLIC_TASK_REPOSITORY: 'graphql' }, /must be "mock" or "api"/],
    [{ EXPO_PUBLIC_API_BASE_URL: 'ftp://files.example.test' }, /must be an http\(s\) URL/],
    [{ EXPO_PUBLIC_API_BASE_URL: 'http://api.example.com' }, /must use https/],
    [{ EXPO_PUBLIC_API_TIMEOUT_MS: '2.5s' }, /non-negative integer/],
    [{ EXPO_PUBLIC_API_TIMEOUT_MS: '0' }, /greater than zero/],
    [{ EXPO_PUBLIC_MOCK_LATENCY_MS: '-1' }, /non-negative integer/],
  ])('rejects invalid input %j with a descriptive error', (env, message) => {
    expect(() => parseAppConfig(env)).toThrow(message);
  });
});
