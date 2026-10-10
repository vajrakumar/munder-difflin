import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import type { ReactNode } from 'react';

export function HoverCard({
  content,
  children,
  openDelay = 280,
  side = 'right'
}: {
  content: ReactNode;
  children: ReactNode;
  openDelay?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
}): JSX.Element {
  return (
    <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={120}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          className="paper-hover-card"
          side={side}
          sideOffset={8}
          align="start"
          collisionPadding={8}
        >
          {content}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
