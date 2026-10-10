/** Archive/reopen/delete (MDF-22). Pure helpers so the gallery screen and
 *  `node --test` share one set of rules. God is never archived. */
import type { PaperAgent, PaperTask } from '../../data/model';

export interface ArchivedRow {
  id: string;
  name: string;
  role: string;
  archivedAt?: string;
  lastTask?: { key: string; title: string };
  diskUsed: string;
  worktreeMissing: boolean;
}

export function isGod(agent: Pick<PaperAgent, 'id' | 'isGod'>): boolean {
  return agent.isGod === true || agent.id === 'god';
}

export function canArchive(agent: Pick<PaperAgent, 'id' | 'isGod' | 'archived'>): boolean {
  return !isGod(agent) && !agent.archived;
}

export function canStop(agent: Pick<PaperAgent, 'id' | 'isGod' | 'archived' | 'stopped'>): boolean {
  return !isGod(agent) && !agent.archived && !agent.stopped;
}

export function confirmDelete(typed: string, name: string): boolean {
  return typed.trim() === name;
}

export function lastTaskFor(id: string, tasks: PaperTask[]): { key: string; title: string } | undefined {
  const mine = tasks.filter((t) => t.assignee === id);
  const doing = mine.find((t) => t.status === 'doing') ?? mine.find((t) => t.status === 'blocked') ?? mine[0];
  return doing ? { key: doing.key, title: doing.title } : undefined;
}

export function toRow(agent: PaperAgent, tasks: PaperTask[]): ArchivedRow {
  const last = agent.lastTaskKey
    ? { key: agent.lastTaskKey, title: agent.lastTaskTitle ?? '' }
    : lastTaskFor(agent.id, tasks);
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role ?? '',
    archivedAt: agent.archivedAt,
    lastTask: last,
    diskUsed: agent.diskUsed ?? '—',
    worktreeMissing: agent.worktreeMissing === true
  };
}

export function archivedRows(agents: PaperAgent[], tasks: PaperTask[]): ArchivedRow[] {
  return agents
    .filter((a) => a.archived)
    .map((a) => toRow(a, tasks))
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '') || a.name.localeCompare(b.name));
}

export function filterRows(rows: ArchivedRow[], query: string): ArchivedRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    `${r.name} ${r.role} ${r.lastTask?.key ?? ''} ${r.lastTask?.title ?? ''}`.toLowerCase().includes(q)
  );
}

function extras(agent: PaperAgent, tasks: PaperTask[], now: string): Pick<PaperAgent, 'archivedAt' | 'lastTaskKey' | 'lastTaskTitle' | 'diskUsed'> {
  const last = lastTaskFor(agent.id, tasks);
  return {
    archivedAt: agent.archivedAt ?? now,
    lastTaskKey: agent.lastTaskKey ?? last?.key,
    lastTaskTitle: agent.lastTaskTitle ?? last?.title,
    diskUsed: agent.diskUsed ?? '12 MB'
  };
}

export function applyStop(agents: PaperAgent[], id: string): PaperAgent[] {
  return agents.map((a) => {
    if (a.id !== id || isGod(a)) return a;
    return { ...a, stopped: true, status: 'idle' as const };
  });
}

export function applyArchive(agents: PaperAgent[], id: string, tasks: PaperTask[], now = new Date().toISOString()): PaperAgent[] {
  return agents.map((a) => {
    if (a.id !== id || isGod(a)) return a;
    return {
      ...a,
      ...extras(a, tasks, now),
      archived: true,
      stopped: true,
      status: 'ghost' as const
    };
  });
}

export function applyReopen(agents: PaperAgent[], id: string, freshWorktree = false): PaperAgent[] {
  return agents.map((a) => {
    if (a.id !== id) return a;
    return {
      ...a,
      archived: false,
      stopped: false,
      status: 'idle' as const,
      worktreeMissing: freshWorktree ? false : a.worktreeMissing
    };
  });
}

export function applyDelete(agents: PaperAgent[], id: string): PaperAgent[] {
  return agents.filter((a) => a.id !== id || isGod(a));
}
