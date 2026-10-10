import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import { IconButton } from './IconButton';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  title,
  description,
  className,
  children
}: {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="paper-overlay" />
      <DialogPrimitive.Content className={cx('paper-sheet', className)}>
        <div className="paper-sheet-head">
          <DialogPrimitive.Title className="paper-sheet-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <IconButton label="Close" size="sm">
              <X size={16} />
            </IconButton>
          </DialogPrimitive.Close>
        </div>
        {description ? (
          <DialogPrimitive.Description className="paper-dialog-desc">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="paper-sr">{title}</DialogPrimitive.Description>
        )}
        <div className="paper-sheet-body">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
