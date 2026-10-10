import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Skeleton({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return <span className={cx('paper-skel', className)} style={style} {...props} />;
}
