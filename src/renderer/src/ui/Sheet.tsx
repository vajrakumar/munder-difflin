import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  title,
  children
}: {
  title: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="paper-overlay" />
      <DialogPrimitive.Content className="paper-sheet">
        <DialogPrimitive.Title className="paper-sheet-title">{title}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
