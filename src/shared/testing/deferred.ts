export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

/** A promise settled from the outside, for holding an async operation "in flight" during a test. */
export function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
