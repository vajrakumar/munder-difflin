/** Inbox items: one row per conversation thread, plus one per ASK ME card. */
import {
  isHuman, isOutside, openQuestion, ticketIn,
  type PaperMail, type PaperTask, type QA
} from '../../data/model';

export type Folder = 'needs' | 'agents' | 'outside' | 'team' | 'all' | 'done';
export const PRIMARY_FOLDERS: Folder[] = ['needs', 'agents', 'outside', 'team'];

interface Base {
  id: string;
  /** Changes when the item gets new activity, so read/done state resets. */
  rev: string;
  at: string;
  from: string;
  subject: string;
  snippet: string;
  ticket?: string;
  needsYou: boolean;
  lane: 'needs' | 'agents' | 'outside' | 'team';
}

export interface AskItem extends Base {
  kind: 'ask';
  task: PaperTask;
  qa: QA;
  resolved: boolean;
}

export interface ThreadItem extends Base {
  kind: 'thread';
  mails: PaperMail[];
  last: PaperMail;
  participants: string[];
}

export type InboxItem = AskItem | ThreadItem;

function firstLine(text: string): string {
  return text.replace(/[*`#>]/g, '').split('\n').map((l) => l.trim()).filter(Boolean).join(' ').slice(0, 180);
}

export function buildItems(tasks: PaperTask[], mail: PaperMail[]): InboxItem[] {
  const items: InboxItem[] = [];

  for (const task of tasks) {
    const open = openQuestion(task);
    const latest = open ?? [...task.humanQA].reverse().find((e) => e.a || e.dismissedAt);
    if (!latest) continue;
    const at = open ? (open.askedAt ?? task.updatedAt ?? task.createdAt) : (latest.answeredAt ?? latest.dismissedAt ?? latest.askedAt ?? task.createdAt);
    items.push({
      kind: 'ask',
      id: `ask:${task.id}`,
      rev: `${task.id}:${task.humanQA.length}:${open ? 'open' : 'closed'}`,
      at,
      from: task.assignee ?? 'god',
      subject: firstLine(latest.q),
      snippet: `${task.key} · ${task.title}`,
      ticket: task.key,
      needsYou: !!open,
      lane: 'needs',
      task,
      qa: latest,
      resolved: !open
    });
  }

  const threads = new Map<string, PaperMail[]>();
  for (const m of mail) {
    const list = threads.get(m.conversation) ?? [];
    list.push(m);
    threads.set(m.conversation, list);
  }
  for (const [conv, list] of threads) {
    list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const first = list[0];
    const last = list[list.length - 1];
    const asksHuman = list.some((m) => isHuman(m.to) || m.needsHuman);
    // Still needs you if the last word on the thread was not yours.
    const needsYou = asksHuman && !isHuman(last.from) && (last.requiresReply || last.needsHuman || isHuman(last.to));
    const lane: ThreadItem['lane'] = asksHuman ? 'needs'
      : isOutside(first.from) ? 'outside'
      : /^team[:/]/i.test(first.from) ? 'team'
      : 'agents';
    const participants = [...new Set(list.flatMap((m) => [m.from, m.to]))];
    items.push({
      kind: 'thread',
      id: `thread:${conv}`,
      rev: last.id,
      at: last.createdAt,
      from: last.from,
      subject: first.subject.replace(/^(re:\s*)+/i, '') || '(no subject)',
      snippet: firstLine(last.body),
      ticket: ticketIn(`${first.subject} ${first.body}`),
      needsYou,
      lane,
      mails: list,
      last,
      participants
    });
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function isDone(item: InboxItem, done: Set<string>): boolean {
  if (item.kind === 'ask') return item.resolved || done.has(item.rev);
  return done.has(item.rev);
}

export function inFolder(item: InboxItem, folder: Folder, done: Set<string>): boolean {
  const d = isDone(item, done);
  if (folder === 'done') return d;
  if (d) return false;
  if (folder === 'all') return true;
  return item.lane === folder;
}

export function matches(item: InboxItem, q: string, nameOf: (id: string) => string): boolean {
  if (!q) return true;
  const hay = item.kind === 'ask'
    ? `${item.subject} ${item.qa.q} ${item.task.key} ${item.task.title} ${nameOf(item.from)}`
    : `${item.subject} ${item.mails.map((m) => `${m.body} ${nameOf(m.from)} ${nameOf(m.to)}`).join(' ')} ${item.ticket ?? ''}`;
  return hay.toLowerCase().includes(q.toLowerCase());
}

export function involves(item: InboxItem, agentId: string): boolean {
  if (item.kind === 'ask') return item.task.assignee === agentId;
  return item.participants.includes(agentId);
}
