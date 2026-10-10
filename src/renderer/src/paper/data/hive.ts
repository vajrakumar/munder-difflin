/** One floor snapshot for the Paper screens: agents, tasks and mail.
 *
 *  Live mode reads the hive through the `window.cth` bridge (registry, the
 *  task ledger and the redacted floor-wide message feed) and polls. Demo mode
 *  (the browser gallery, no bridge) serves fixtures and applies edits in
 *  memory, so every screen is fully interactive in `npm run gallery`.
 *
 *  Writes follow the ledger rules in `shared/taskLedger.ts`: patch one card's
 *  raw fields through `hivePatchTask`, never re-serialize a display model. */
import { useSyncExternalStore } from 'react';
import type { StatusName } from '@/design/paper';
import { DEMO_AGENTS, demoMail, demoTasks } from './fixtures';
import {
  parseMail, parseTasks, openQuestion,
  type PaperAgent, type PaperMail, type PaperTask, type QA, type TaskPriority, type TaskStatus
} from './model';

export type FloorMode = 'live' | 'demo';

export interface FloorSnapshot {
  mode: FloorMode;
  loaded: boolean;
  agents: PaperAgent[];
  tasks: PaperTask[];
  mail: PaperMail[];
  error?: string;
}

const POLL_MS = 5000;
const HUMAN = 'human';

function bridge(): Window['cth'] | undefined {
  try {
    const c = (window as { cth?: Window['cth'] }).cth;
    return c && typeof c.hiveTasks === 'function' ? c : undefined;
  } catch {
    return undefined;
  }
}

function statusFrom(raw: string | undefined, archived?: boolean): StatusName {
  if (archived) return 'ghost';
  switch ((raw ?? '').toLowerCase()) {
    case 'working': case 'busy': case 'running': return 'working';
    case 'thinking': return 'thinking';
    case 'waiting': return 'waiting';
    case 'blocked': case 'needs-human': return 'blocked';
    case 'looping': return 'looping';
    case 'compacting': return 'compacting';
    default: return 'idle';
  }
}

let snapshot: FloorSnapshot = { mode: bridge() ? 'live' : 'demo', loaded: false, agents: [], tasks: [], mail: [] };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit(next: Partial<FloorSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

async function loadLive(): Promise<void> {
  const cth = bridge();
  if (!cth) return;
  try {
    const [reg, rawTasks, rawMail] = await Promise.all([
      cth.hiveRegistry(),
      cth.hiveTasks(),
      cth.hiveMessages({ limit: 500, includeArchived: true })
    ]);
    const agents: PaperAgent[] = Object.values(reg?.agents ?? {}).map((a) => ({
      id: a.id,
      name: a.name || a.id,
      role: a.role,
      isGod: a.isGod || a.id === reg.godId,
      archived: a.archived,
      status: statusFrom(a.status, a.archived)
    }));
    const seen = new Set<string>();
    const mail: PaperMail[] = [];
    for (const m of rawMail ?? []) {
      const parsed = parseMail(m as unknown as Record<string, unknown>);
      if (!parsed || seen.has(parsed.id)) continue;
      seen.add(parsed.id);
      mail.push(parsed);
    }
    emit({ loaded: true, agents, tasks: parseTasks(rawTasks), mail, error: undefined });
  } catch (err) {
    emit({ loaded: true, error: err instanceof Error ? err.message : String(err) });
  }
}

function start(): void {
  if (snapshot.mode === 'demo') {
    if (!snapshot.loaded) emit({ loaded: true, agents: DEMO_AGENTS, tasks: demoTasks(), mail: demoMail() });
    return;
  }
  void loadLive();
  timer = setInterval(() => void loadLive(), POLL_MS);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useFloor(): FloorSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function agentName(agents: PaperAgent[], id: string | undefined): string {
  if (!id) return 'Unassigned';
  if (id === HUMAN) return 'You';
  return agents.find((a) => a.id === id)?.name ?? id;
}

// ─── Writes ──────────────────────────────────────────────────────────────

type TaskPatch = Partial<{ status: TaskStatus; assignee: string | null; priority: TaskPriority; humanQA: QA[] }>;

function applyLocal(id: string, patch: TaskPatch): PaperTask[] {
  const prev = snapshot.tasks;
  const now = new Date().toISOString();
  emit({
    tasks: prev.map((t) => {
      if (t.id !== id) return t;
      const next: PaperTask = { ...t, updatedAt: now };
      if (patch.status) {
        next.status = patch.status;
        if (patch.status === 'doing' && !t.startedAt) next.startedAt = now;
        if (patch.status === 'done') next.completedAt = now;
      }
      if ('assignee' in patch) next.assignee = patch.assignee ?? undefined;
      if (patch.priority) next.priority = patch.priority;
      if (patch.humanQA) next.humanQA = patch.humanQA;
      return next;
    })
  });
  return prev;
}

export async function patchTask(id: string, patch: TaskPatch): Promise<boolean> {
  const prev = applyLocal(id, patch);
  const cth = bridge();
  if (!cth) return true;
  try {
    const raw: Record<string, unknown> = { ...patch, updatedAt: new Date().toISOString() };
    const res = await cth.hivePatchTask(id, raw as Parameters<typeof cth.hivePatchTask>[1]);
    if (!res.ok) throw new Error(res.error ?? 'patch refused');
    return true;
  } catch {
    emit({ tasks: prev });
    return false;
  }
}

async function send(msg: Pick<PaperMail, 'to' | 'act' | 'subject' | 'body'> & { conversation?: string; inReplyTo?: string }): Promise<boolean> {
  const cth = bridge();
  if (!cth) {
    const local: PaperMail = {
      id: `local-${Date.now().toString(36)}`,
      conversation: msg.conversation ?? `conv-${Date.now().toString(36)}`,
      inReplyTo: msg.inReplyTo ?? null,
      from: HUMAN,
      to: msg.to,
      act: msg.act,
      subject: msg.subject,
      body: msg.body,
      requiresReply: false,
      needsHuman: false,
      createdAt: new Date().toISOString()
    };
    emit({ mail: [...snapshot.mail, local] });
    return true;
  }
  try {
    const res = await cth.hiveSend({
      to: msg.to,
      act: msg.act,
      subject: msg.subject,
      body: msg.body,
      conversation: msg.conversation,
      in_reply_to: msg.inReplyTo ?? null
    }, HUMAN);
    if (res.ok) void loadLive();
    return res.ok;
  } catch {
    return false;
  }
}

/** Reply in a mail thread, as the human, to whoever wrote the last message. */
export function replyTo(last: PaperMail, body: string): Promise<boolean> {
  const to = last.from === HUMAN ? last.to : last.from;
  const subject = /^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`;
  return send({ to, act: 'inform', subject, body, conversation: last.conversation, inReplyTo: last.id });
}

/** Answer the open question on an ASK ME card, then tell the god (same contract
 *  as the classic ASK ME tab: the answer lives in humanQA, god unblocks). */
export async function answerQuestion(task: PaperTask, text: string): Promise<boolean> {
  const open = openQuestion(task);
  const answer = text.trim();
  if (!open || !answer) return false;
  const humanQA = task.humanQA.map((e) => (e === open ? { ...e, a: answer, answeredAt: new Date().toISOString() } : e));
  const ok = await patchTask(task.id, { humanQA });
  if (!ok) return false;
  await send({
    to: 'god',
    act: 'inform',
    subject: `HUMAN ANSWER on task "${task.rawTitle}"`,
    body: [
      `The human answered the open question on task ${task.id} ("${task.rawTitle}"):`,
      `Q: ${open.q}`,
      `A: ${answer}`,
      'The answer is also recorded in the card\'s humanQA. Act on it, unblock the card, and continue the work.'
    ].join('\n')
  });
  return true;
}

/** Take the open ask off the human's queue without inventing an answer. */
export function dismissQuestion(task: PaperTask): Promise<boolean> {
  const open = openQuestion(task);
  if (!open) return Promise.resolve(false);
  const humanQA = task.humanQA.map((e) => (e === open ? { ...e, dismissedAt: new Date().toISOString() } : e));
  return patchTask(task.id, { humanQA });
}

export const HUMAN_ID = HUMAN;
