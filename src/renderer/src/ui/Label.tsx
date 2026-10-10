import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentPropsWithoutRef } from 'react';
import { cx } from './cx';

export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>): JSX.Element {
  return <LabelPrimitive.Root className={cx('paper-label', className)} {...props} />;
}
