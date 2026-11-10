/**
 * The single error shape that crosses layer boundaries (repositories → thunks → UI).
 *
 * Errors are plain serialisable objects rather than Error instances so they can live in Redux state.
 * `message` is always safe to show to the user; diagnostic detail is kept separately.
 */
export type FieldErrors = Readonly<Partial<Record<string, string>>>;

export type AppError =
  | { readonly kind: 'validation'; readonly message: string; readonly fieldErrors: FieldErrors }
  | { readonly kind: 'not_found'; readonly message: string }
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'network'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string }
  | { readonly kind: 'cancelled'; readonly message: string }
  | { readonly kind: 'http'; readonly status: number; readonly message: string }
  | { readonly kind: 'invalid_response'; readonly message: string; readonly detail: string }
  | { readonly kind: 'unexpected'; readonly message: string };

export type AppErrorKind = AppError['kind'];

const APP_ERROR_KINDS: readonly AppErrorKind[] = [
  'validation',
  'not_found',
  'unauthorized',
  'network',
  'timeout',
  'cancelled',
  'http',
  'invalid_response',
  'unexpected',
];

/** Narrows values caught at runtime (e.g. from `unwrap()`) to an AppError. */
export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null || !('kind' in value) || !('message' in value)) return false;
  return APP_ERROR_KINDS.some((kind) => kind === value.kind) && typeof value.message === 'string';
}

export function validationError(message: string, fieldErrors: FieldErrors = {}): AppError {
  return { kind: 'validation', message, fieldErrors };
}

export function notFoundError(message: string): AppError {
  return { kind: 'not_found', message };
}

export function unauthorizedError(message: string): AppError {
  return { kind: 'unauthorized', message };
}

/** Fallback for failures outside the typed contract, e.g. a thunk that threw. */
export function unexpectedError(): AppError {
  return { kind: 'unexpected', message: 'Something went wrong. Please try again.' };
}

export function networkError(): AppError {
  return { kind: 'network', message: 'You appear to be offline. Check your connection and try again.' };
}

export function timeoutError(): AppError {
  return { kind: 'timeout', message: 'The request took too long. Please try again.' };
}

export function cancelledError(): AppError {
  return { kind: 'cancelled', message: 'The request was cancelled.' };
}

export function httpError(status: number): AppError {
  return { kind: 'http', status, message: describeHttpStatus(status) };
}

export function invalidResponseError(detail: string): AppError {
  return { kind: 'invalid_response', message: 'The server returned an unexpected response.', detail };
}

function describeHttpStatus(status: number): string {
  if (status === 401 || status === 403) return 'You don’t have access to this. Please sign in again.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return `The request failed (HTTP ${status}).`;
}
