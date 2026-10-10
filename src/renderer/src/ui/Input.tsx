import { type InputHTMLAttributes, forwardRef } from 'react';
import { cx } from './cx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx('paper-input', className)} {...props} />;
  }
);
