/** Display models shared by the Paper screens (Inbox MDF-15, Tasks MDF-16).
 *  Parsing is defensive: tasks.json is hand-written by the god and messages
 *  come from many engines, so every field except the shape is optional. */
import type { StatusName } from '@/design/paper';

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export const TASK_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

export interface QA {
  q: string;
  a?: string;
  askedAt?: string;
  answeredAt?: string;
  dismissedAt?: string;
}

export interface PaperAgent {
  id: string;
  name: string;
  role?: string;
  status: StatusName;
  isGod?: boolean;
  archived?: boolean;
}

export interface PaperTask {
  id: string;
  /** Ticket key shown in mono, e.g. MDF-15. Falls back to a short id. */
  key: string;
  /** Title with the roadmap tags ([P1][L]) lifted out. */
  title: string;
  rawTitle: string;
  phase?: string;
  size?: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  deps: string[];
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
  humanQA: QA[];
}

export type MailAct = 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';

export interface PaperMail {
  id: string;
  conversation: string;
  inReplyTo?: string | null;
  from: string;
  to: string;
  act: MailAct;
  subject: string;
  body: string;
  requiresReply: boolean;
  needsHuman: boolean;
  createdAt: string;
}

const KEY_RE = /^[A-Z][A-Z0-9]{1,9}-\d+$/;
const TAG_RE = /^\s*((?:\[[^\]]{1,6}\]\s*)+)/;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

export function priorityFrom(v: unknown): TaskPriority {
  if (typeof v === 'number') {
    if (v <= 1) return 'urgent';
    if (v === 2) return 'high';
    if (v === 3) return 'medium';
    return 'low';
  }
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  if (s === 'urgent' || s === 'critical' || s === 'p0') return 'urgent';
  if (s === 'high' || s === 'p1') return 'high';
  if (s === 'low' || s === 'p3' || s === 'none') return 'low';
  return 'medium';
}

/** Lift "[P1][L]" roadmap tags off a title. */
export function splitTitle(raw: string): { title: string; phase?: string; size?: string } {
  const m = TAG_RE.exec(raw);
  if (!m) return { title: raw.trim() };
  const tags = [...m[1].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].trim());
  const phase = tags.find((t) => /^P\d$/i.test(t))?.toUpperCase();
  const size = tags.find((t) => /^(XS|S|M|L|XL)$/i.test(t))?.toUpperCase();
  return { title: raw.slice(m[0].length).trim() || raw.trim(), phase, size };
}

export function parseTask(t: Record<string, unknown>, i: number): PaperTask {
  const id = str(t.id) ?? `t-${i}`;
  const rawTitle = str(t.title) ?? '(untitled)';
  const { title, phase, size } = splitTitle(rawTitle);
  const depsRaw = Array.isArray(t.deps) ? t.deps : Array.isArray(t.dependsOn) ? t.dependsOn : [];
  const status = (TASK_STATUSES as unknown[]).includes(t.status) ? (t.status as TaskStatus) : 'todo';
  const qa = Array.isArray(t.humanQA)
    ? (t.humanQA as unknown[])
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object' && typeof (e as { q?: unknown }).q === 'string')
      .map((e) => ({
        q: e.q as string,
        a: str(e.a),
        askedAt: str(e.askedAt),
        answeredAt: str(e.answeredAt),
        dismissedAt: str(e.dismissedAt)
      }))
    : [];
  return {
    id,
    key: KEY_RE.test(id) ? id : id.slice(0, 8).toUpperCase(),
    title,
    rawTitle,
    phase,
    size,
    description: str(t.description),
    status,
    priority: priorityFrom(t.priority),
    assignee: str(t.assignee),
    deps: depsRaw.filter((d): d is string => typeof d === 'string'),
    createdAt: str(t.createdAt) ?? new Date(0).toISOString(),
    updatedAt: str(t.updatedAt),
    startedAt: str(t.startedAt),
    completedAt: str(t.completedAt) ?? str(t.doneAt),
    humanQA: qa
  };
}

export function parseTasks(raw: unknown): PaperTask[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks)
    ? (raw as { tasks: unknown[] }).tasks
    : Array.isArray(raw) ? raw : [];
  return list
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map(parseTask);
}

/** The card's open question for the human (unanswered and not dismissed). */
export function openQuestion(t: PaperTask): QA | undefined {
  for (let i = t.humanQA.length - 1; i >= 0; i--) {
    const e = t.humanQA[i];
    if (!e.a && !e.dismissedAt) return e;
  }
  return undefined;
}

const ACTS: MailAct[] = ['request', 'inform', 'propose', 'query', 'agree', 'refuse', 'done'];

export function parseMail(m: Record<string, unknown>): PaperMail | null {
  const id = str(m.id);
  if (!id) return null;
  return {
    id,
    conversation: str(m.conversation) ?? id,
    inReplyTo: str(m.in_reply_to) ?? null,
    from: str(m.from) ?? 'unknown',
    to: str(m.to) ?? 'unknown',
    act: (ACTS as unknown[]).includes(m.act) ? (m.act as MailAct) : 'inform',
    subject: str(m.subject) ?? '',
    body: typeof m.body === 'string' ? m.body : '',
    requiresReply: m.requires_reply === true,
    needsHuman: m.needs_human === true,
    createdAt: str(m.created_at) ?? new Date(0).toISOString()
  };
}

/** Senders that are not agents on the floor: integrations and webhooks. */
const OUTSIDE_RE = /^(slack|webhook|automation|trigger|mission|telegram|github|linear|email|http)\b/i;

export function isOutside(from: string): boolean {
  return OUTSIDE_RE.test(from);
}

export function isHuman(id: string): boolean {
  return id === 'human' || id === 'me' || id === 'operator';
}

/** First ticket key named in a subject or body, e.g. "MDF-15". */
export function ticketIn(text: string): string | undefined {
  return /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/.exec(text)?.[1];
}
