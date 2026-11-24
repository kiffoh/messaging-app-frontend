import { useEffect, useState } from 'react';

/** State that resets to null `ms` after being set to a non-null value. */
function useAutoClearingState<T>(ms: number): [T | null, (value: T | null) => void] {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (value === null) return;
    const t = setTimeout(() => setValue(null), ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return [value, setValue];
}

export default useAutoClearingState;
