import {
  cancelledError,
  httpError,
  invalidResponseError,
  networkError,
  timeoutError,
  type AppError,
} from '@/shared/lib/appError';
import { err, ok, type Result } from '@/shared/lib/result';

/** The subset of `Response` the service relies on; lets tests supply plain objects. */
export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
}

export type FetchFn = (url: string, init: RequestInit) => Promise<HttpResponse>;

/**
 * Turns an untrusted JSON payload into a typed value. Returning an error message instead of throwing
 * keeps malformed responses an ordinary, typed failure (`invalid_response`).
 */
export type Decoder<T> = (input: unknown) => Result<T, string>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  readonly method: HttpMethod;
  /** Path relative to the base URL, starting with `/`. */
  readonly path: string;
  /** Serialised as JSON when present. */
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

export interface ApiServiceOptions {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly fetch?: FetchFn;
  /** Supplies per-request headers such as `Authorization`. Evaluated on every request. */
  readonly getHeaders?: () => Record<string, string>;
}

/**
 * Minimal JSON-over-HTTP client: base URL, JSON headers, timeout, caller cancellation and one error
 * vocabulary (`AppError`). It deliberately has no retry, caching or interceptor machinery.
 */
export class ApiService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchFn;
  private readonly getHeaders: () => Record<string, string>;

  constructor({ baseUrl, timeoutMs, fetch: fetchFn, getHeaders }: ApiServiceOptions) {
    this.getHeaders = getHeaders ?? (() => ({}));
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
    this.fetchFn = fetchFn ?? ((url, init) => fetch(url, init));
  }

  /** Sends a request and decodes its JSON response body. */
  async request<T>(request: ApiRequest, decode: Decoder<T>): Promise<Result<T, AppError>> {
    const response = await this.execute(request);
    if (!response.ok) return response;

    const payload = parseJson(response.value.text);
    if (!payload.ok) return err(invalidResponseError(`Response body is not valid JSON (HTTP ${response.value.status}).`));

    const decoded = decode(payload.value);
    return decoded.ok ? decoded : err(invalidResponseError(decoded.error));
  }

  /** Sends a request whose response body is irrelevant (e.g. DELETE); the body is never parsed. */
  async send(request: ApiRequest): Promise<Result<void, AppError>> {
    const response = await this.execute(request);
    return response.ok ? ok(undefined) : response;
  }

  private async execute({ method, path, body, signal }: ApiRequest): Promise<Result<{ status: number; text: string }, AppError>> {
    if (signal?.aborted) return err(cancelledError());

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const forwardAbort = () => controller.abort();
    signal?.addEventListener('abort', forwardAbort, { once: true });

    const headers: Record<string, string> = { ...this.getHeaders(), Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      return response.ok ? ok({ status: response.status, text }) : err(httpError(response.status));
    } catch {
      if (timedOut) return err(timeoutError());
      if (controller.signal.aborted) return err(cancelledError());
      return err(networkError());
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }
}

/** An empty body (e.g. `204 No Content`) parses to `null`. */
function parseJson(text: string): Result<unknown, string> {
  if (text.trim() === '') return ok(null);
  try {
    const value: unknown = JSON.parse(text);
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Invalid JSON');
  }
}
