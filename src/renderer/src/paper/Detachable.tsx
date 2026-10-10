/** Detach a Paper view into its own window (gallery popup). Leaves a
 *  "Shown in another window — Bring back" placeholder. */
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { PanelTop } from 'lucide-react';
import { Button, IconButton } from '@/ui';
import {
  currentBounds, detachHref, isDetached, keyOf, markAttached, markDetached,
  parseDetachQuery, readBounds, subscribeDetach, windowFeatures, writeBounds,
  type DetachTarget
} from './detach';
import { copyFor, currentLang } from './screens/archived/copy';

export function useDetached(target: DetachTarget): boolean {
  const key = keyOf(target);
  return useSyncExternalStore(subscribeDetach, () => isDetached(key), () => false);
}

export function openDetached(target: DetachTarget): Window | null {
  const key = keyOf(target);
  const bounds = readBounds(key);
  const w = window.open(detachHref(target), `paper-detach-${key}`, windowFeatures(bounds));
  if (!w) return null;
  markDetached(key);
  return w;
}

export function bringBack(target: DetachTarget): void {
  const key = keyOf(target);
  try {
    const existing = window.open('', `paper-detach-${key}`);
    existing?.close();
  } catch { /* noop */ }
  markAttached(key);
}

export function toggleDetach(target: DetachTarget): boolean {
  if (isDetached(keyOf(target))) {
    bringBack(target);
    return true;
  }
  return !!openDetached(target);
}

export function persistThisWindow(key: string): void {
  writeBounds(key, currentBounds());
}

export function DetachButton({ target, label }: { target: DetachTarget; label?: string }): JSX.Element | null {
  const away = useDetached(target);
  const t = copyFor(currentLang());
  if (typeof window !== 'undefined' && parseDetachQuery(window.location.search)) return null;
  return (
    <IconButton
      label={label ?? t.detach}
      size="sm"
      onClick={() => { toggleDetach(target); }}
      aria-pressed={away}
    >
      <PanelTop size={14} />
    </IconButton>
  );
}

export function Detachable({
  target,
  children,
  label
}: {
  target: DetachTarget;
  children: ReactNode;
  label?: string;
}): JSX.Element {
  const away = useDetached(target);
  const nested = typeof window !== 'undefined' && !!parseDetachQuery(window.location.search);
  useEffect(() => {
    if (nested) return;
    const on = (e: MessageEvent): void => {
      const data = e.data as { type?: string; key?: string } | null;
      if (!data || data.key !== keyOf(target)) return;
      if (data.type === 'hello') markDetached(data.key);
      if (data.type === 'closed' || data.type === 'bring') markAttached(data.key);
    };
    window.addEventListener('message', on);
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('paper-detach');
      ch.onmessage = (ev) => on({ data: ev.data } as MessageEvent);
    } catch { /* no BroadcastChannel */ }
    return () => {
      window.removeEventListener('message', on);
      try { ch?.close(); } catch { /* noop */ }
    };
  }, [target, nested]);

  const t = copyFor(currentLang());
  if (nested) return <>{children}</>;
  if (away) {
    return (
      <div className="paper-detach-placeholder" role="status">
        <p>{t.placeholder}</p>
        <Button variant="secondary" onClick={() => bringBack(target)}>{label ?? t.bring}</Button>
      </div>
    );
  }
  return <>{children}</>;
}
