import { isAppError, unexpectedError, type AppError } from '@/shared/lib/appError';

export type ActionOutcome<T> =
  | { readonly status: 'succeeded'; readonly value: T }
  | { readonly status: 'failed'; readonly error: AppError }
  /** A thunk `condition` declined to run, e.g. a duplicate submission. Nothing happened. */
  | { readonly status: 'skipped' };

function isConditionRejection(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ConditionError';
}

/** Awaits a dispatched thunk and describes its outcome as a value instead of a thrown error. */
export async function runAction<T>(dispatched: { unwrap(): Promise<T> }): Promise<ActionOutcome<T>> {
  try {
    return { status: 'succeeded', value: await dispatched.unwrap() };
  } catch (error) {
    if (isConditionRejection(error)) return { status: 'skipped' };
    return { status: 'failed', error: isAppError(error) ? error : unexpectedError() };
  }
}
