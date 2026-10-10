import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ children }: { children: ReactNode }): JSX.Element {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="paper-menu" sideOffset={6} align="start">
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  children,
  onSelect
}: {
  children: ReactNode;
  onSelect?: () => void;
}): JSX.Element {
  return (
    <DropdownMenu.Item className="paper-menu-item" onSelect={onSelect}>
      {children}
    </DropdownMenu.Item>
  );
}
