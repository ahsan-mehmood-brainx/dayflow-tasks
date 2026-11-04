import { err, ok } from '@/shared/lib/result';

import { ApiService, type Decoder, type FetchFn, type HttpResponse } from '../ApiService';

const BASE_URL = 'https://api.example.test/v1';
const passThrough: Decoder<unknown> = (input) => ok(input);

function response(status: number, text: string): HttpResponse {
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

function createService(fetch: FetchFn, timeoutMs = 1_000) {
  return new ApiService({ baseUrl: `${BASE_URL}/`, timeoutMs, fetch });
}

/** A request that only settles when its signal aborts, like a stalled connection. */
const hangingFetch: FetchFn = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  });

describe('ApiService', () => {
  it('sends JSON requests to the base URL and decodes the response', async () => {
    const fetch = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>(async () => response(200, '{"id":"task-1"}'));

    const result = await createService(fetch).request({ method: 'POST', path: '/tasks', body: { title: 'A' } }, passThrough);

    expect(result).toEqual({ ok: true, value: { id: 'task-1' } });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/tasks`);
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"title":"A"}',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });

  it('omits the JSON content type when there is no body and decodes an empty body as null', async () => {
    const fetch = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>(async () => response(204, ''));

    const result = await createService(fetch).request({ method: 'DELETE', path: '/tasks/1' }, passThrough);

    expect(result).toEqual({ ok: true, value: null });
    expect(fetch.mock.calls[0]?.[1].headers).toEqual({ Accept: 'application/json' });
  });

  it('adds headers from getHeaders to every request', async () => {
    const fetch = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>(async () => response(200, 'null'));
    const service = new ApiService({ baseUrl: BASE_URL, timeoutMs: 1_000, fetch, getHeaders: () => ({ Authorization: 'Bearer t' }) });

    await service.request({ method: 'GET', path: '/tasks' }, passThrough);

    expect(fetch.mock.calls[0]?.[1].headers).toEqual({ Authorization: 'Bearer t', Accept: 'application/json' });
  });

  it('send() ignores the response body entirely', async () => {
    const result = await createService(async () => response(200, 'Deleted.')).send({ method: 'DELETE', path: '/tasks/1' });

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('returns an http error for unsuccessful status codes', async () => {
    const result = await createService(async () => response(500, '{"message":"boom"}')).request({ method: 'GET', path: '/tasks' }, passThrough);

    expect(result).toEqual({ ok: false, error: expect.objectContaining({ kind: 'http', status: 500 }) });
  });

  it('returns a network error when the request cannot be made', async () => {
    const result = await createService(async () => {
      throw new TypeError('Network request failed');
    }).request({ method: 'GET', path: '/tasks' }, passThrough);

    expect(!result.ok && result.error.kind).toBe('network');
  });

  it('rejects malformed JSON as an invalid response', async () => {
    const result = await createService(async () => response(200, '<html>Gateway</html>')).request({ method: 'GET', path: '/tasks' }, passThrough);

    expect(!result.ok && result.error.kind).toBe('invalid_response');
  });

  it('surfaces decoder failures as an invalid response with diagnostic detail', async () => {
    const decodeNumber: Decoder<number> = (input) => (typeof input === 'number' ? ok(input) : err('expected a number'));

    const result = await createService(async () => response(200, '"seven"')).request({ method: 'GET', path: '/count' }, decodeNumber);

    expect(result).toEqual({ ok: false, error: expect.objectContaining({ kind: 'invalid_response', detail: 'expected a number' }) });
  });

  it('aborts and reports a timeout when the server does not respond in time', async () => {
    const result = await createService(hangingFetch, 20).request({ method: 'GET', path: '/tasks' }, passThrough);

    expect(!result.ok && result.error.kind).toBe('timeout');
  });

  it('reports cancellation when the caller aborts an in-flight request', async () => {
    const controller = new AbortController();
    const pending = createService(hangingFetch).request({ method: 'GET', path: '/tasks', signal: controller.signal }, passThrough);

    controller.abort();

    await expect(pending).resolves.toEqual({ ok: false, error: expect.objectContaining({ kind: 'cancelled' }) });
  });

  it('does not issue a request when the signal is already aborted', async () => {
    const fetch = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>();
    const controller = new AbortController();
    controller.abort();

    const result = await createService(fetch).request({ method: 'GET', path: '/tasks', signal: controller.signal }, passThrough);

    expect(!result.ok && result.error.kind).toBe('cancelled');
    expect(fetch).not.toHaveBeenCalled();
  });
});
