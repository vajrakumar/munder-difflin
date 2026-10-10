/** A per-viewer set of ids (read, done) kept in localStorage. A convenience
 *  only: storage can be missing or throw, and the screens work without it.
 *  One store per key, so every component reading a key (the inbox screen and
 *  the sidebar badge) sees the same set. */
import { useCallback, useSyncExternalStore } from 'react';

interface Store { set: Set<string>; listeners: Set<() => void> }
const stores = new Map<string, Store>();

function load(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function storeFor(key: string): Store {
  let s = stores.get(key);
  if (!s) {
    s = { set: load(key), listeners: new Set() };
    stores.set(key, s);
  }
  return s;
}

export function useViewerSet(key: string): [Set<string>, (ids: string[], on: boolean) => void] {
  const store = storeFor(key);
  const subscribe = useCallback((l: () => void) => {
    store.listeners.add(l);
    return () => { store.listeners.delete(l); };
  }, [store]);
  const set = useSyncExternalStore(subscribe, () => store.set);
  const update = useCallback((ids: string[], on: boolean) => {
    const next = new Set(store.set);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    store.set = next;
    try { localStorage.setItem(key, JSON.stringify([...next].slice(-2000))); } catch { /* noop */ }
    store.listeners.forEach((l) => l());
  }, [key, store]);
  return [set, update];
}
