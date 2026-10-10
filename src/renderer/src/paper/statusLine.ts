import type { PaperAgent } from './demoData';

export function isLiveAgent(a: PaperAgent): boolean {
  return a.status === 'working' || a.status === 'thinking' || a.status === 'looping' || a.status === 'typing';
}

/** One string for the title bar and Home subtitle. */
export function floorStatusLine(agents: PaperAgent[]): string {
  const live = agents.filter(isLiveAgent).length;
  const asked = agents.filter((a) => a.askedYou).length;
  return `${live} live · ${asked} asked · ${agents.length} agents`;
}

export function spendTodayLabel(agents: PaperAgent[]): string {
  const total = agents.reduce((sum, a) => sum + parseMoney(a.costToday), 0);
  return `$${total.toFixed(2)}`;
}

function parseMoney(s?: string): number {
  if (!s) return 0;
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
