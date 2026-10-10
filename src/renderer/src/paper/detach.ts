/** Detachable windows (MDF-22) for the Paper gallery.
 *
 *  Electron would call `window:detach` / `window:attach`. In the browser
 *  gallery we open a query-string popup (`?detach=terminal&agent=id`) and
 *  keep the same pty/view identity — never a second session. Bounds persist
 *  in localStorage so a later popup restores size and position. */

export type DetachView = 'ide' | 'terminal' | 'office';

export interface DetachTarget {
  view: DetachView;
  agentId?: string;
}

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export const DETACH_CHANNEL = 'paper-detach';
export const BOUNDS_PREFIX = 'paper.detach.bounds.';
const DEFAULT: WindowBounds = { width: 960, height: 640 };

export function keyOf(t: DetachTarget): string {
  return t.agentId ? `${t.view}:${t.agentId}` : t.view;
}

export function parseKey(key: string): DetachTarget | null {
  const [view, agentId] = key.split(':');
  if (view !== 'ide' && view !== 'terminal' && view !== 'office') return null;
  return agentId ? { view, agentId } : { view };
}

export function parseDetachQuery(search: string): DetachTarget | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const view = q.get('detach');
  if (view !== 'ide' && view !== 'terminal' && view !== 'office') return null;
  const agentId = q.get('agent') || undefined;
  return agentId ? { view, agentId } : { view };
}

export function detachSearch(t: DetachTarget): string {
  const q = new URLSearchParams();
  q.set('detach', t.view);
  if (t.agentId) q.set('agent', t.agentId);
  return `?${q.toString()}`;
}

export function detachHref(t: DetachTarget): string {
  const path = typeof location !== 'undefined' ? location.pathname : '/paper.html';
  return `${path}${detachSearch(t)}`;
}

export function boundsStorageKey(key: string): string {
  return `${BOUNDS_PREFIX}${key}`;
}

export function parseBounds(raw: string | null): WindowBounds | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<WindowBounds>;
    const width = Number(v.width);
    const height = Number(v.height);
    if (!(width > 200) || !(height > 160)) return null;
    const out: WindowBounds = { width: Math.round(width), height: Math.round(height) };
    if (typeof v.x === 'number') out.x = Math.round(v.x);
    if (typeof v.y === 'number') out.y = Math.round(v.y);
    return out;
  } catch {
    return null;
  }
}

export function readBounds(key: string): WindowBounds {
  try {
    return parseBounds(localStorage.getItem(boundsStorageKey(key))) ?? { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeBounds(key: string, b: WindowBounds): void {
  try {
    localStorage.setItem(boundsStorageKey(key), JSON.stringify(b));
  } catch { /* quota */ }
}

export function currentBounds(): WindowBounds {
  return {
    x: typeof window !== 'undefined' ? window.screenX : undefined,
    y: typeof window !== 'undefined' ? window.screenY : undefined,
    width: typeof window !== 'undefined' ? window.outerWidth : DEFAULT.width,
    height: typeof window !== 'undefined' ? window.outerHeight : DEFAULT.height
  };
}

export function windowFeatures(b: WindowBounds): string {
  const parts = [`width=${b.width}`, `height=${b.height}`, 'menubar=no', 'toolbar=no', 'location=no'];
  if (typeof b.x === 'number') parts.push(`left=${b.x}`);
  if (typeof b.y === 'number') parts.push(`top=${b.y}`);
  return parts.join(',');
}

export type DetachMsg =
  | { type: 'hello'; key: string }
  | { type: 'closed'; key: string }
  | { type: 'bring'; key: string };

type Listener = () => void;

const detached = new Set<string>();
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function isDetached(key: string): boolean {
  return detached.has(key);
}

export function listDetached(): string[] {
  return [...detached];
}

export function markDetached(key: string): void {
  if (detached.has(key)) return;
  detached.add(key);
  emit();
}

export function markAttached(key: string): void {
  if (!detached.delete(key)) return;
  emit();
}

export function subscribeDetach(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function focusedViewFromRoute(route: string, agentId?: string): DetachTarget {
  if (route === 'home') return { view: 'office' };
  if (route === 'agent' || route === 'orchestrator') return { view: 'terminal', agentId: agentId ?? 'god' };
  return { view: 'ide', agentId };
}
