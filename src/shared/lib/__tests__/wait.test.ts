import { wait } from '../wait';

describe('wait', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves "elapsed" after the delay', async () => {
    const promise = wait(500);
    await jest.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toBe('elapsed');
  });

  it('does not resolve before the delay', async () => {
    const onDone = jest.fn();
    void wait(500).then(onDone);
    await jest.advanceTimersByTimeAsync(499);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('resolves immediately for a zero or negative delay without scheduling a timer', async () => {
    await expect(wait(0)).resolves.toBe('elapsed');
    await expect(wait(-10)).resolves.toBe('elapsed');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves "aborted" straight away when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(wait(1000, controller.signal)).resolves.toBe('aborted');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves "aborted" early and clears its timer when aborted mid-wait', async () => {
    const controller = new AbortController();
    const promise = wait(1000, controller.signal);
    controller.abort();
    await expect(promise).resolves.toBe('aborted');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('removes its abort listener once the delay elapses', async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    const promise = wait(100, controller.signal);
    await jest.advanceTimersByTimeAsync(100);
    await promise;
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
