import { applyPaperTheme, type PaperTheme } from '@/design/paper';

export type PaperThemePref = 'system' | PaperTheme;

const KEY = 'paper.themePref';

export function readThemePref(): PaperThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'system' || v === 'light' || v === 'dark' || v === 'hc') return v;
  } catch { /* noop */ }
  return 'system';
}

export function writeThemePref(pref: PaperThemePref): void {
  try { localStorage.setItem(KEY, pref); } catch { /* noop */ }
}

export function systemIsDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolvedTheme(pref: PaperThemePref, dark = systemIsDark()): PaperTheme {
  if (pref === 'system') return dark ? 'dark' : 'light';
  return pref;
}

export function applyPref(pref: PaperThemePref, dark = systemIsDark()): PaperTheme {
  const theme = resolvedTheme(pref, dark);
  applyPaperTheme(theme);
  return theme;
}
