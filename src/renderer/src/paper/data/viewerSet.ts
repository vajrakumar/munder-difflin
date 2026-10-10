/** A per-viewer set of ids (read, done) kept in localStorage. A convenience
 *  only: storage can be missing or throw, and the screens work without it. */
import { useCallback, useState } from 'react';

function load(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function useViewerSet(key: string): [Set<string>, (ids: string[], on: boolean) => void] {
  const [set, setSet] = useState(() => load(key));
  const update = useCallback((ids: string[], on: boolean) => {
    setSet((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      try { localStorage.setItem(key, JSON.stringify([...next].slice(-2000))); } catch { /* noop */ }
      return next;
    });
  }, [key]);
  return [set, update];
}
