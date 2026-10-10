import { forwardRef } from 'react';
import { Button, type ButtonProps } from './Button';
import { cx } from './cx';

export interface IconButtonProps extends ButtonProps {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, variant = 'ghost', ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      aria-label={label}
      title={label}
      className={cx('paper-icon-btn', className)}
      {...props}
    />
  );
});
