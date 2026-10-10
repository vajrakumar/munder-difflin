import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({ children }: { children: ReactNode }): JSX.Element {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content className="paper-popover" sideOffset={6} align="start">
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
