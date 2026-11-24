import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useMediaQuery from './useMediaQuery';

function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return matches; },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach(l => l());
    },
    listenerCount: () => listeners.size,
  };
}

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the current match', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 550px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the change listener fires', () => {
    const mq = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 550px)'));
    expect(result.current).toBe(false);
    act(() => mq.set(true));
    expect(result.current).toBe(true);
  });

  it('removes its listener on unmount', () => {
    const mq = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 550px)'));
    expect(mq.listenerCount()).toBe(1);
    unmount();
    expect(mq.listenerCount()).toBe(0);
  });
});
