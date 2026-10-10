import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  children,
  align = 'start'
}: {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
}): JSX.Element {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="paper-menu" sideOffset={6} align={align}>
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

export function MenuCheckboxItem({
  children,
  checked,
  onCheckedChange
}: {
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <DropdownMenu.CheckboxItem
      className="paper-menu-item"
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
    >
      {children}
    </DropdownMenu.CheckboxItem>
  );
}

export function MenuRadioGroup({
  value,
  onValueChange,
  children
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
      {children}
    </DropdownMenu.RadioGroup>
  );
}

export function MenuRadioItem({
  value,
  children
}: {
  value: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <DropdownMenu.RadioItem className="paper-menu-item" value={value}>
      {children}
    </DropdownMenu.RadioItem>
  );
}

export function MenuSeparator(): JSX.Element {
  return <DropdownMenu.Separator className="paper-menu-sep" />;
}
