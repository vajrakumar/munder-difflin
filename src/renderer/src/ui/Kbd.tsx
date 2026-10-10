import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>): JSX.Element {
  return <kbd className={cx('paper-kbd', className)} {...props} />;
}
