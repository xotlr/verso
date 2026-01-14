import { useState, useEffect } from 'react';

/**
 * Hook to persist state in localStorage with Set support
 */
export function usePersistedSet<T = string>(
  key: string,
  initialValue: Set<T> = new Set()
): [Set<T>, React.Dispatch<React.SetStateAction<Set<T>>>] {
  const [value, setValue] = useState<Set<T>>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.warn(`Error loading persisted state for key "${key}":`, error);
    }

    return initialValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(Array.from(value)));
    } catch (error) {
      console.warn(`Error persisting state for key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
