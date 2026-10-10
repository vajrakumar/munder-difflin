import { paperThemeFromRoot, space, type PaperTheme } from '@/design/paper';

export type PaperDensity = 'compact' | 'comfortable' | 'roomy';
export type PaperAccent =
  | 'indigo' | 'coral' | 'mint' | 'sky' | 'lemon' | 'lilac' | 'peach';

const DENSITY_KEY = 'paper.density';
const ACCENT_KEY = 'paper.accent';
const OFFICE_KEY = 'paper.officeView';

export const ACCENT_HUES: Record<PaperAccent, number> = {
  indigo: 264,
  coral: 18,
  mint: 155,
  sky: 230,
  lemon: 90,
  lilac: 300,
  peach: 40
};

const DENSITY_SCALE: Record<PaperDensity, number> = {
  compact: 0.82,
  comfortable: 1,
  roomy: 1.18
};

const LIGHT_LC: Array<readonly [number, number]> = [
  [0.985, 0.012], [0.968, 0.024], [0.945, 0.042], [0.915, 0.062],
  [0.875, 0.082], [0.820, 0.095], [0.720, 0.110], [0.600, 0.130],
  [0.500, 0.155], [0.445, 0.150], [0.420, 0.120], [0.310, 0.110]
];
const DARK_LC: Array<readonly [number, number]> = [
  [0.200, 0.030], [0.230, 0.040], [0.265, 0.055], [0.305, 0.070],
  [0.350, 0.085], [0.410, 0.095], [0.500, 0.110], [0.600, 0.125],
  [0.680, 0.140], [0.740, 0.130], [0.800, 0.080], [0.900, 0.040]
];
const HC_LC: Array<readonly [number, number]> = [
  [0.980, 0.020], [0.955, 0.040], [0.920, 0.065], [0.870, 0.090],
  [0.810, 0.115], [0.730, 0.140], [0.600, 0.160], [0.450, 0.180],
  [0.320, 0.180], [0.250, 0.160], [0.280, 0.140], [0.180, 0.120]
];

function lcFor(theme: PaperTheme): Array<readonly [number, number]> {
  if (theme === 'dark') return DARK_LC;
  if (theme === 'hc') return HC_LC;
  return LIGHT_LC;
}

export function readDensity(): PaperDensity {
  try {
    const v = localStorage.getItem(DENSITY_KEY);
    if (v === 'compact' || v === 'comfortable' || v === 'roomy') return v;
  } catch { /* noop */ }
  return 'comfortable';
}

export function writeDensity(v: PaperDensity): void {
  try { localStorage.setItem(DENSITY_KEY, v); } catch { /* noop */ }
}

export function readAccent(): PaperAccent {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    if (v && v in ACCENT_HUES) return v as PaperAccent;
  } catch { /* noop */ }
  return 'indigo';
}

export function writeAccent(v: PaperAccent): void {
  try { localStorage.setItem(ACCENT_KEY, v); } catch { /* noop */ }
}

export function readOfficeView(): boolean {
  try { return localStorage.getItem(OFFICE_KEY) === '1'; } catch { return false; }
}

export function writeOfficeView(on: boolean): void {
  try { localStorage.setItem(OFFICE_KEY, on ? '1' : '0'); } catch { /* noop */ }
}

export function applyDensity(density: PaperDensity, root: HTMLElement = document.documentElement): void {
  const scale = DENSITY_SCALE[density];
  root.dataset.paperDensity = density;
  for (const [k, px] of Object.entries(space)) {
    root.style.setProperty(`--paper-space-${k}`, `${Math.round(px * scale)}px`);
  }
}

export function applyAccent(
  accent: PaperAccent,
  theme: PaperTheme = paperThemeFromRoot(),
  root: HTMLElement = document.documentElement
): void {
  const hue = ACCENT_HUES[accent];
  root.dataset.paperAccent = accent;
  lcFor(theme).forEach(([l, c], i) => {
    const L = (l * 100).toFixed(2);
    const C = c.toFixed(4);
    root.style.setProperty(`--paper-accent-${i + 1}`, `oklch(${L}% ${C} ${hue})`);
  });
}

export function applyOfficeView(on: boolean, root: HTMLElement = document.documentElement): void {
  if (on) root.dataset.paperOffice = 'on';
  else delete root.dataset.paperOffice;
}

export function applyAppearance(opts: {
  density: PaperDensity;
  accent: PaperAccent;
  officeView: boolean;
  theme?: PaperTheme;
}): void {
  applyDensity(opts.density);
  applyAccent(opts.accent, opts.theme);
  applyOfficeView(opts.officeView);
}

export function hydrateAppearance(): void {
  applyAppearance({
    density: readDensity(),
    accent: readAccent(),
    officeView: readOfficeView()
  });
}
