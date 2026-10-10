import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }): JSX.Element {
  return (
    <span
      className={cx('paper-badge', tone !== 'neutral' && `paper-badge-${tone}`, className)}
      {...props}
    />
  );
}
