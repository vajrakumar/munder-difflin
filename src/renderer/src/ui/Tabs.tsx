import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentPropsWithoutRef } from 'react';
import { cx } from './cx';

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>): JSX.Element {
  return <TabsPrimitive.List className={cx('paper-tabs-list', className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>): JSX.Element {
  return <TabsPrimitive.Trigger className={cx('paper-tabs-trigger', className)} {...props} />;
}

export const TabsContent = TabsPrimitive.Content;
