/**
 * Resolves after `ms` milliseconds, or early with `'aborted'` when the signal fires.
 * The timer and abort listener are always cleaned up.
 */
export function wait(ms: number, signal?: AbortSignal): Promise<'elapsed' | 'aborted'> {
  if (signal?.aborted) return Promise.resolve('aborted');
  if (ms <= 0) return Promise.resolve('elapsed');

  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve('aborted');
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve('elapsed');
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
