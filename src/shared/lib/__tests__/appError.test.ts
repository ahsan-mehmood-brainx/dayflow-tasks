import {
  cancelledError,
  httpError,
  invalidResponseError,
  isAppError,
  networkError,
  notFoundError,
  timeoutError,
  unauthorizedError,
  unexpectedError,
  validationError,
} from '../appError';

describe('AppError factories', () => {
  it('builds each error with its kind and a user-safe message', () => {
    expect(validationError('Fix the form', { title: 'Required' })).toEqual({
      kind: 'validation',
      message: 'Fix the form',
      fieldErrors: { title: 'Required' },
    });
    expect(validationError('Fix the form')).toMatchObject({ fieldErrors: {} });
    expect(notFoundError('Gone')).toEqual({ kind: 'not_found', message: 'Gone' });
    expect(unauthorizedError('Nope')).toEqual({ kind: 'unauthorized', message: 'Nope' });
    expect(unexpectedError().kind).toBe('unexpected');
    expect(networkError().kind).toBe('network');
    expect(timeoutError().kind).toBe('timeout');
    expect(cancelledError().kind).toBe('cancelled');
  });

  it('keeps diagnostic detail out of the user-facing message', () => {
    const error = invalidResponseError('tasks[2].priority is bad');
    expect(error).toMatchObject({ kind: 'invalid_response', detail: 'tasks[2].priority is bad' });
    expect(error.message).not.toContain('priority');
  });

  it.each([
    [401, /sign in again/],
    [403, /sign in again/],
    [404, /not found/],
    [429, /Too many requests/],
    [500, /server ran into a problem/],
    [503, /server ran into a problem/],
    [418, /HTTP 418/],
  ])('describes HTTP %i', (status, pattern) => {
    const error = httpError(status);
    expect(error).toMatchObject({ kind: 'http', status });
    expect(error.message).toMatch(pattern);
  });
});

describe('isAppError', () => {
  it('accepts every well-formed error', () => {
    for (const error of [networkError(), timeoutError(), cancelledError(), unexpectedError(), httpError(500), notFoundError('x')]) {
      expect(isAppError(error)).toBe(true);
    }
  });

  it.each([
    ['null', null],
    ['a string', 'boom'],
    ['an Error instance', new Error('boom')],
    ['an unknown kind', { kind: 'mystery', message: 'x' }],
    ['a missing message', { kind: 'network' }],
    ['a non-string message', { kind: 'network', message: 42 }],
  ])('rejects %s', (_label, value) => {
    expect(isAppError(value)).toBe(false);
  });
});
