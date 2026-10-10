import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="paper-overlay" />
      <DialogPrimitive.Content className="paper-dialog">
        <DialogPrimitive.Title className="paper-dialog-title">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="paper-dialog-desc">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
