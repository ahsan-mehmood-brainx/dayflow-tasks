import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useToday } from '../useToday';

describe('useToday', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 2, 23, 59, 0));
  });
  afterEach(() => jest.useRealTimers());

  it('starts as the current local calendar day', async () => {
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-11-02');
  });

  it('rolls over to the next day after midnight', async () => {
    const { result } = await renderHook(() => useToday());

    await act(async () => {
      jest.setSystemTime(new Date(2026, 10, 3, 0, 0, 5));
      await jest.advanceTimersByTimeAsync(65_000);
    });

    expect(result.current).toBe('2026-11-03');
  });

  it('refreshes when the app returns to the foreground', async () => {
    let listener: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler;
      return { remove: jest.fn() };
    });
    const { result } = await renderHook(() => useToday());

    await act(async () => {
      jest.setSystemTime(new Date(2026, 10, 4, 8, 0, 0));
      listener?.('background');
    });
    expect(result.current).toBe('2026-11-02');

    await act(async () => {
      listener?.('active');
    });
    expect(result.current).toBe('2026-11-04');
  });

  it('cleans up its timer and AppState subscription on unmount', async () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
    const { unmount } = await renderHook(() => useToday());
    const clear = jest.spyOn(globalThis, 'clearTimeout');

    await unmount();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalled();
  });
});
