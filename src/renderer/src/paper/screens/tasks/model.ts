/** Filter and timeline helpers for the Tasks screen (MDF-16). */
import type { BadgeTone } from '@/ui';
import type { PaperAgent, PaperTask, TaskPriority, TaskStatus } from '../../data/model';
import { MS, startOfDay } from '../../data/time';

export type View = 'board' | 'list' | 'timeline';
export type DateFilter = 'any' | 'today' | 'week' | 'month';
export type OwnerFilter = 'all' | 'unassigned' | string;
export type StatusFilter = 'all' | TaskStatus;

export const VIEWS: View[] = ['board', 'list', 'timeline'];
export const COLUMNS: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  blocked: 'Blocked',
  done: 'Done'
};

export const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  todo: 'neutral',
  doing: 'accent',
  blocked: 'danger',
  done: 'success'
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'accent',
  low: 'neutral'
};

const PRI_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function sortList(tasks: PaperTask[]): PaperTask[] {
  return [...tasks].sort((a, b) => {
    const s = COLUMNS.indexOf(a.status) - COLUMNS.indexOf(b.status);
    if (s) return s;
    const p = PRI_RANK[a.priority] - PRI_RANK[b.priority];
    if (p) return p;
    return Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt);
  });
}

export function readView(): View {
  try {
    const v = localStorage.getItem('paper.tasks.view');
    if (v === 'board' || v === 'list' || v === 'timeline') return v;
  } catch { /* gallery / private mode */ }
  return 'board';
}

export function writeView(view: View): void {
  try { localStorage.setItem('paper.tasks.view', view); } catch { /* noop */ }
}

export function indexById(tasks: PaperTask[]): Map<string, PaperTask> {
  return new Map(tasks.map((t) => [t.id, t]));
}

/** Deps that are still open — the card is waiting on these. */
export function waitingOn(t: PaperTask, index: Map<string, PaperTask>): PaperTask[] {
  return t.deps
    .map((id) => index.get(id))
    .filter((d): d is PaperTask => !!d && d.status !== 'done');
}

export function matchesDate(t: PaperTask, filter: DateFilter, now = Date.now()): boolean {
  if (filter === 'any') return true;
  const ts = Date.parse(t.updatedAt ?? t.createdAt);
  if (Number.isNaN(ts)) return false;
  if (filter === 'today') return ts >= startOfDay(new Date(now));
  if (filter === 'week') return now - ts < 7 * MS.DAY;
  return now - ts < 30 * MS.DAY;
}

export function filterTasks(
  tasks: PaperTask[],
  opts: {
    owner: OwnerFilter;
    status: StatusFilter;
    date: DateFilter;
    query: string;
    nameOf: (id: string | undefined) => string;
  },
  now = Date.now()
): PaperTask[] {
  const q = opts.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (opts.owner === 'unassigned' && t.assignee) return false;
    if (opts.owner !== 'all' && opts.owner !== 'unassigned' && t.assignee !== opts.owner) return false;
    if (opts.status !== 'all' && t.status !== opts.status) return false;
    if (!matchesDate(t, opts.date, now)) return false;
    if (q) {
      const hay = `${t.key} ${t.title} ${t.rawTitle} ${t.description ?? ''} ${t.deps.join(' ')} ${opts.nameOf(t.assignee)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function ownersFrom(tasks: PaperTask[], agents: PaperAgent[]): PaperAgent[] {
  const ids = new Set(tasks.map((t) => t.assignee).filter((id): id is string => !!id));
  return agents.filter((a) => ids.has(a.id));
}

export function span(t: PaperTask, now = Date.now()): { start: number; end: number; point: boolean } {
  const created = Date.parse(t.createdAt);
  const started = t.startedAt ? Date.parse(t.startedAt) : NaN;
  const done = t.completedAt ? Date.parse(t.completedAt) : NaN;
  const start = Number.isFinite(started) ? started : (Number.isFinite(created) ? created : now);
  if (t.status === 'todo' && !Number.isFinite(started)) {
    return { start, end: start, point: true };
  }
  const end = Number.isFinite(done) ? done : now;
  return { start, end: Math.max(end, start + MS.HOUR), point: false };
}

export function axis(tasks: PaperTask[], now = Date.now()): { start: number; end: number } {
  let start = now;
  let end = now;
  for (const t of tasks) {
    const s = span(t, now);
    start = Math.min(start, s.start);
    end = Math.max(end, s.end);
    const created = Date.parse(t.createdAt);
    if (Number.isFinite(created)) start = Math.min(start, created);
  }
  start -= 4 * MS.HOUR;
  end += 4 * MS.HOUR;
  if (end - start < 2 * MS.DAY) start = end - 2 * MS.DAY;
  return { start, end };
}

export function ticks(start: number, end: number): Array<{ t: number; label: string }> {
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  const out: Array<{ t: number; label: string }> = [];
  let t = startOfDay(new Date(start + MS.DAY));
  while (t < end) {
    out.push({ t, label: fmt.format(t) });
    t += MS.DAY;
  }
  return out;
}

export function pct(t: number, start: number, end: number): number {
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100));
}

export type TimelineGroup = { id: string; label: string; tasks: PaperTask[] };

export function groupTimeline(tasks: PaperTask[], agents: PaperAgent[], nameOf: (id: string | undefined) => string): TimelineGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, PaperTask[]>();
  const push = (id: string, t: PaperTask): void => {
    if (!buckets.has(id)) {
      buckets.set(id, []);
      order.push(id);
    }
    buckets.get(id)!.push(t);
  };
  const agentIds = new Set(agents.map((a) => a.id));
  const sorted = [...tasks].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const a of agents) {
    for (const t of sorted) {
      if (t.assignee === a.id) push(a.id, t);
    }
  }
  for (const t of sorted) {
    if (!t.assignee) push('unassigned', t);
    else if (!agentIds.has(t.assignee) && t.assignee) push(t.assignee, t);
  }
  return order.map((id) => ({
    id,
    label: id === 'unassigned' ? 'Unassigned' : nameOf(id),
    tasks: buckets.get(id) ?? []
  }));
}

export type DepEdge = { from: string; to: string; x1: number; y1: number; x2: number; y2: number };

export function depEdges(
  rows: PaperTask[],
  index: Map<string, PaperTask>,
  start: number,
  end: number,
  now = Date.now()
): DepEdge[] {
  const rowOf = new Map(rows.map((t, i) => [t.id, i]));
  const n = Math.max(rows.length, 1);
  const edges: DepEdge[] = [];
  for (const t of rows) {
    const toRow = rowOf.get(t.id);
    if (toRow === undefined) continue;
    const tSpan = span(t, now);
    for (const depId of t.deps) {
      const dep = index.get(depId);
      const fromRow = rowOf.get(depId);
      if (!dep || fromRow === undefined) continue;
      const dSpan = span(dep, now);
      edges.push({
        from: depId,
        to: t.id,
        x1: pct(dSpan.end, start, end),
        y1: ((fromRow + 0.5) / n) * 100,
        x2: pct(tSpan.start, start, end),
        y2: ((toRow + 0.5) / n) * 100
      });
    }
  }
  return edges;
}
