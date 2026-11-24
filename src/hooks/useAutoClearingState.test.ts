import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAutoClearingState from './useAutoClearingState';

describe('useAutoClearingState', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('schedules no timer while null', () => {
    const { result } = renderHook(() => useAutoClearingState<string>(2000));
    expect(result.current[0]).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resets to null after ms', () => {
    const { result } = renderHook(() => useAutoClearingState<string>(2000));
    act(() => result.current[1]('err'));
    act(() => { vi.advanceTimersByTime(1999); });
    expect(result.current[0]).toBe('err');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current[0]).toBeNull();
  });
});
