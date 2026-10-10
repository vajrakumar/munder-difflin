import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cx } from './cx';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={cx('paper-table', className)} {...props} />;
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <thead {...props} />;
}

export const TBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TBody(props, ref) {
    return <tbody ref={ref} {...props} />;
  }
);

export function TR(props: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return <tr {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <th className={className} {...props} />;
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={className} {...props} />;
}
