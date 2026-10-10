/** Routed screens for the Paper shell. Each screen folder exports `route` and
 *  `Screen` from `screen.tsx`; this registry picks them up, so adding a screen
 *  never edits the shell or this file. */
import type { ComponentType } from 'react';
import type { PaperRoute } from '../routes';

export interface PaperScreenModule {
  route: PaperRoute;
  Screen: ComponentType;
}

const modules = import.meta.glob<PaperScreenModule>('./*/screen.tsx', { eager: true });

export const SCREENS: Partial<Record<PaperRoute, ComponentType>> = {};
for (const mod of Object.values(modules)) {
  if (mod?.route && mod.Screen) SCREENS[mod.route] = mod.Screen;
}
