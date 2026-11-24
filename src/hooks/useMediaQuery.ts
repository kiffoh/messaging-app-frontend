import { useCallback, useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query; re-renders when its match state changes. */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export default useMediaQuery;
