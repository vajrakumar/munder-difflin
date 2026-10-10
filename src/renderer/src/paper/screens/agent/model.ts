/** Agent room (MDF-13) pure helpers: the room's display model, the
 *  attachment message convention and the demo terminal for the gallery. */
import type { PaperMail, PaperTask, TaskStatus } from '../../data/model';

export interface RoomInfo {
  engine?: string;
  model?: string;
  cwd?: string;
  worktree?: string;
  contextTokens?: number;
  contextLimit?: number;
}

export interface Attachment {
  /** Absolute path the agent reads (live), or a stable demo key. */
  path: string;
  name: string;
  /** Object URL for the thumbnail; revoked when the chip goes away. */
  preview?: string;
}

/** Same convention as the classic composer and the Slack inbound path, so
 *  agents Read the files directly instead of receiving bytes. */
export function withAttachments(text: string, atts: Attachment[]): string {
  if (!atts.length) return text;
  const head = text.trim() ? `${text}\n\nAttached files:\n` : 'Attached files:\n';
  return head + atts.map((a) => `- ${a.path} (${a.name})`).join('\n');
}

export function mailFor(mail: PaperMail[], id: string): PaperMail[] {
  return mail
    .filter((m) => m.from === id || m.to === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const ORDER: TaskStatus[] = ['doing', 'blocked', 'todo', 'done'];

export function tasksFor(tasks: PaperTask[], id: string): PaperTask[] {
  return tasks
    .filter((t) => t.assignee === id)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.key.localeCompare(b.key, undefined, { numeric: true }));
}

export function contextPct(info: RoomInfo): number | undefined {
  if (!info.contextTokens || !info.contextLimit) return undefined;
  return Math.min(100, Math.round((info.contextTokens / info.contextLimit) * 100));
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

// ─── Demo (gallery, no bridge) ─────────────────────────────────────────────

const DEMO_INFO: Record<string, RoomInfo> = {
  god: { engine: 'Claude Code', model: 'claude-opus-5-5', cwd: '~/myDifflin', contextTokens: 312_000, contextLimit: 1_000_000 },
  'developer-mv2fn62v': { engine: 'Grok CLI', model: 'grok-4.6', cwd: '~/myDifflin/munder-difflin', worktree: 'worktrees/munder-difflin-ui', contextTokens: 141_000, contextLimit: 256_000 },
  'tester-mv2fnyz5': { engine: 'Grok CLI', model: 'grok-4.6', cwd: '~/myDifflin', contextTokens: 64_000, contextLimit: 256_000 },
  'phyllis-mv2fq1rq': { engine: 'Claude Code', model: 'claude-sonnet-5-5', cwd: '~/myDifflin/munder-difflin', contextTokens: 88_000, contextLimit: 200_000 },
  'dwight-mv2fp3un': { engine: 'Claude Code', model: 'claude-sonnet-5-5', cwd: '~/myDifflin', contextTokens: 21_000, contextLimit: 200_000 }
};

export function demoInfo(id: string): RoomInfo {
  return DEMO_INFO[id] ?? { engine: 'Claude Code', model: 'claude-sonnet-5-5', cwd: '~/myDifflin', contextTokens: 12_000, contextLimit: 200_000 };
}

const ESC = '\u001b[';
const dim = (s: string): string => `${ESC}2m${s}${ESC}0m`;
const green = (s: string): string => `${ESC}32m${s}${ESC}0m`;
const blue = (s: string): string => `${ESC}34m${s}${ESC}0m`;

export function demoTerminal(name: string, line: string | undefined): string[] {
  return [
    dim(`── ${name} · demo terminal (no live pty in the gallery) ──`),
    '',
    `${blue('●')} Read inbox/2026-10-10T14-29-08.json`,
    `${blue('●')} ${line ?? 'Working on the next card'}`,
    `  ${dim('⎿')} Read src/renderer/src/paper/screens/index.ts (18 lines)`,
    `  ${dim('⎿')} Edit src/renderer/src/paper/screens/agent/screen.tsx`,
    `${green('✓')} npm run typecheck:web ${dim('· 0 errors')}`,
    '',
    `${dim('>')} `
  ];
}
