import type { ReactNode } from 'react';
import type { StatusName } from '@/design/paper';
import { cx } from './cx';

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable hue in 0–360 from a name, so the same agent always looks the same. */
export function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  name,
  size = 'md',
  hue,
  className
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  hue?: number;
  className?: string;
}): JSX.Element {
  const h = hue ?? hueFromName(name);
  return (
    <span
      className={cx('paper-avatar', size !== 'md' && `paper-avatar-${size}`, className)}
      title={name}
      aria-label={name}
      style={{ ['--paper-avatar-hue' as string]: String(h) }}
    >
      {initialsFrom(name)}
    </span>
  );
}

export function StatusRing({
  status,
  children,
  className
}: {
  status: StatusName;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cx('paper-status-ring', className)}
      data-status={status}
      title={status}
    >
      {children}
    </span>
  );
}
