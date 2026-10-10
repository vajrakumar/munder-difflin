/** Demo floor for the browser gallery (`npm run gallery`, paper.html), where
 *  there is no Electron bridge. Shaped like a real hive so the screens can be
 *  judged on realistic density. Times are relative to page load. */
import type { PaperAgent, PaperMail, PaperTask, QA, TaskPriority, TaskStatus } from './model';
import { splitTitle } from './model';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function at(offsetMs: number, base = Date.now()): string {
  return new Date(base - offsetMs).toISOString();
}

export const DEMO_AGENTS: PaperAgent[] = [
  { id: 'god', name: 'Michael', role: 'Orchestrator', status: 'working', isGod: true },
  { id: 'dwight-mv2fp3un', name: 'Dwight', role: 'Product planning', status: 'idle' },
  { id: 'developer-mv2fn62v', name: 'Developer', role: 'Builds and keeps the codebase healthy', status: 'working' },
  { id: 'tester-mv2fnyz5', name: 'Tester', role: 'Tests the code and files bugs', status: 'waiting' },
  { id: 'phyllis-mv2fq1rq', name: 'Phyllis', role: 'Prepares and ships releases', status: 'thinking' },
  { id: 'worker-ui-inbox-tasks', name: 'Kelly', role: 'Temp: Inbox and Tasks screens', status: 'working' },
  { id: 'researcher-mv2fpi4s', name: 'Researcher', role: 'Gathers and summarizes', status: 'ghost', archived: true }
];

type Seed = {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  deps?: string[];
  /** created, started, finished: hours before now */
  c: number;
  s?: number;
  f?: number;
  description?: string;
  qa?: QA[];
};

const DEV = 'developer-mv2fn62v';
const KELLY = 'worker-ui-inbox-tasks';

const SEEDS: Seed[] = [
  { id: 'MDF-1', title: '[P0][S] Clone the upstream repo and run it isolated', status: 'done', assignee: DEV, c: 170, s: 168, f: 160, priority: 'high',
    description: 'Clone `HarnessMD/munder-difflin`, install, and run the dev build against its **own** user data folder.\n\n- Never use the live userData\n- Record everything in `FORK_NOTES.md`' },
  { id: 'MDF-2', title: '[P0][M] Product plan: Pro parity and UI direction', status: 'done', assignee: 'dwight-mv2fp3un', c: 170, s: 166, f: 150, priority: 'high',
    description: 'Inventory free vs Pro features, write the gap table and a phased roadmap into `PLAN.md`.' },
  { id: 'MDF-3', title: '[P0][S] Baseline bug sweep', status: 'done', assignee: 'tester-mv2fnyz5', deps: ['MDF-1'], c: 160, s: 150, f: 130, priority: 'medium' },
  { id: 'MDF-4', title: '[P0][M] Side-by-side packaging for the fork', status: 'done', assignee: 'phyllis-mv2fq1rq', deps: ['MDF-1'], c: 160, s: 140, f: 120, priority: 'medium' },
  { id: 'MDF-6', title: '[P0][M] Paper design tokens and DESIGN.md', status: 'done', assignee: DEV, deps: ['MDF-2'], c: 140, s: 130, f: 110, priority: 'high' },
  { id: 'MDF-7', title: '[P0][L] Component library on Radix, plus gallery', status: 'done', assignee: DEV, deps: ['MDF-6'], c: 140, s: 108, f: 84, priority: 'high' },
  { id: 'MDF-8', title: '[P0][L] App shell behind the classic-UI flag', status: 'done', assignee: DEV, deps: ['MDF-7'], c: 140, s: 82, f: 60, priority: 'high' },
  { id: 'MDF-9', title: '[P0][M] Command palette and action registry', status: 'done', assignee: DEV, deps: ['MDF-8'], c: 140, s: 58, f: 46, priority: 'medium' },
  { id: 'MDF-10', title: '[P0][S] Vector avatars and status rings', status: 'done', assignee: DEV, deps: ['MDF-8'], c: 140, s: 45, f: 38, priority: 'medium' },
  { id: 'MDF-36', title: '[P0][S] Pin the harness home away from the installed app', status: 'done', assignee: 'phyllis-mv2fq1rq', c: 40, s: 36, f: 20, priority: 'urgent',
    description: 'A dev build attached to the live hive twice. Pin `harnessHome` to a fork-only folder and refuse to start otherwise.' },
  { id: 'MDF-11', title: '[P1][M] Pro sidebar: projects, drag order, live line, asked-you, notes', status: 'doing', assignee: DEV, deps: ['MDF-8', 'MDF-10'], c: 30, s: 6, priority: 'high' },
  { id: 'MDF-12', title: '[P1][M] Home: live agent tile grid and filters', status: 'todo', assignee: DEV, deps: ['MDF-11'], c: 30, priority: 'medium' },
  { id: 'MDF-13', title: '[P1][L] Agent room screen, including image paste', status: 'todo', assignee: DEV, deps: ['MDF-11'], c: 30, priority: 'medium' },
  { id: 'MDF-14', title: '[P1][M] Orchestrator screen', status: 'todo', assignee: DEV, deps: ['MDF-13'], c: 30, priority: 'medium' },
  { id: 'MDF-15', title: '[P1][L] Unified Inbox', status: 'doing', assignee: KELLY, deps: ['MDF-8'], c: 30, s: 4, priority: 'high',
    description: 'Three columns: filters (Needs you · Agents · Outside · Team), list, detail. Inline answer for questions on ASK ME cards. Keyboard triage with `j` `k` `e` `r`.' },
  { id: 'MDF-16', title: '[P1][L] Tasks: board, list and timeline, ticket keys, filters, side-sheet', status: 'todo', assignee: KELLY, deps: ['MDF-15'], c: 30, priority: 'high' },
  { id: 'MDF-17', title: '[P1][L] Automations: schema, quiet hours, guardrails, presets', status: 'todo', c: 30, priority: 'medium' },
  { id: 'MDF-18', title: '[P1][L] Memory browser with cards, list and WebGL graph', status: 'todo', c: 30, priority: 'medium' },
  { id: 'MDF-19', title: '[P1][L] Capabilities: marketplace, who-has-what, role bundles', status: 'blocked', assignee: 'dwight-mv2fp3un', c: 30, s: 3, priority: 'medium',
    qa: [{ q: '**Which marketplace should Capabilities list first?**\n\n- `Official MCP registry` only\n- Registry plus `skills` from this repo\n- Everything, with a trust badge', askedAt: at(42 * MIN) }] },
  { id: 'MDF-20', title: '[P1][M] Temps history and Connections screens', status: 'todo', c: 30, priority: 'low' },
  { id: 'MDF-21', title: '[P1][L] Searchable settings and new onboarding', status: 'blocked', assignee: DEV, c: 30, s: 2, priority: 'medium',
    qa: [
      { q: 'Keep the pixel office as an optional view?', a: 'Yes, optional view. Do not restyle it yet.', askedAt: at(26 * HOUR), answeredAt: at(25 * HOUR) },
      { q: '**Settings: one Save for the whole page, or save each field as it changes?**\n\n- One Save with a diff preview (PLAN.md)\n- Save per field, with undo', askedAt: at(12 * MIN) }
    ] },
  { id: 'MDF-22', title: '[P1][M] Archive and reopen agents, detachable IDE', status: 'todo', c: 30, priority: 'low' },
  { id: 'MDF-23', title: '[P2][L] Local Whisper engine with model management', status: 'todo', c: 30, priority: 'low' },
  { id: 'MDF-25', title: '[P2][L] Stapler floating ring', status: 'todo', deps: ['MDF-23'], c: 30, priority: 'low' },
  { id: 'MDF-35', title: 'ASK ME: scope questions for the fork', status: 'done', c: 28, s: 28, f: 24, priority: 'high',
    qa: [{ q: 'Is Teams (Phase 4) in scope?', a: 'Not for now. Skip Teams.', askedAt: at(28 * HOUR), answeredAt: at(24 * HOUR) }] }
];

export function demoTasks(base = Date.now()): PaperTask[] {
  return SEEDS.map((s) => {
    const { title, phase, size } = splitTitle(s.title);
    const startedAt = s.s != null ? at(s.s * HOUR, base) : undefined;
    const completedAt = s.f != null ? at(s.f * HOUR, base) : undefined;
    return {
      id: s.id,
      key: s.id,
      title,
      rawTitle: s.title,
      phase,
      size,
      description: s.description,
      status: s.status,
      priority: s.priority ?? 'medium',
      assignee: s.assignee,
      deps: s.deps ?? [],
      createdAt: at(s.c * HOUR, base),
      startedAt,
      completedAt,
      updatedAt: completedAt ?? startedAt ?? at(s.c * HOUR, base),
      humanQA: s.qa ?? []
    };
  });
}

type MailSeed = Omit<PaperMail, 'createdAt' | 'requiresReply' | 'needsHuman' | 'inReplyTo'> & {
  m: number;
  reply?: boolean;
  human?: boolean;
  re?: string;
};

const MAIL: MailSeed[] = [
  { id: 'm01', conversation: 'conv-mdf11', from: 'god', to: DEV, act: 'request', m: 380, reply: true,
    subject: 'MDF-11 Pro sidebar', body: 'Build the Pro sidebar on fork/main.\n\n- Agents grouped by project, drag to reorder\n- One-line live status and an **asked you** flag\n- Notes section and ticket hover cards\n\nOne branch, commit locally, do not push.' },
  { id: 'm02', conversation: 'conv-mdf11', from: DEV, to: 'god', act: 'inform', m: 350, re: 'm01',
    subject: 'Re: MDF-11 Pro sidebar', body: 'Started on `feat/mdf-11-sidebar`. Project grouping reads `role` until the registry carries a project field.' },
  { id: 'm03', conversation: 'conv-bug-41', from: 'tester-mv2fnyz5', to: 'god', act: 'inform', m: 205,
    subject: 'MDF-10 a11y: status ring has no text alternative', body: 'The ring sets `title` only. Screen readers announce the initials and nothing about status.\n\nSeverity P2. Suggest an `aria-label` like "Developer, working".' },
  { id: 'm04', conversation: 'conv-bug-41', from: 'god', to: DEV, act: 'request', m: 190, reply: true, re: 'm03',
    subject: 'Fix: status ring text alternative (from Tester)', body: 'Please fold this into MDF-11 since you are in the avatar code.' },
  { id: 'm05', conversation: 'conv-slack-ops', from: 'slack:#ops', to: 'god', act: 'request', m: 95, reply: true,
    subject: 'Slack · #ops: can we get a build for Friday’s demo?', body: '@Michael can the fork ship a build with the new sidebar for Friday’s demo? Even unsigned is fine.' },
  { id: 'm06', conversation: 'conv-gh-77', from: 'github:vajrakumar/munder-difflin', to: 'god', act: 'inform', m: 72,
    subject: 'GitHub · PR #77 opened: MDF-36 pin harness home', body: 'phyllis-mv2fq1rq opened **#77** against `main`.\n\n+212 −18 across 6 files. Checks: typecheck ✓, unit ✓.' },
  { id: 'm07', conversation: 'conv-budget', from: 'god', to: 'human', act: 'query', m: 34, reply: true, human: true,
    subject: 'Raise today’s token budget to $40?', body: 'Developer and Kelly are both on large UI cards. At the current rate the floor reaches the **$25** daily cap around 18:00.\n\n- Raise to `$40` for today\n- Keep `$25` and pause Kelly at the cap' },
  { id: 'm08', conversation: 'conv-mdf15', from: 'god', to: KELLY, act: 'request', m: 30, reply: true,
    subject: 'MDF-15 Unified Inbox, then MDF-16 Tasks', body: 'Build both screens on the Paper design system. Preview only in the gallery, never the Electron app.' },
  { id: 'm09', conversation: 'conv-mdf15', from: KELLY, to: 'god', act: 'inform', m: 22, re: 'm08',
    subject: 'Re: MDF-15 Unified Inbox', body: 'On it. Inbox first: three columns, keyboard triage, inline answers for ASK ME cards.' },
  { id: 'm10', conversation: 'conv-release', from: 'phyllis-mv2fq1rq', to: 'god', act: 'propose', m: 18, reply: true,
    subject: 'Release 0.6.0-fork.2 after MDF-11 lands?', body: 'Proposal: cut `0.6.0-fork.2` once the sidebar merges. Unsigned arm64 only; notes drafted in `RELEASING.md`.' },
  { id: 'm11', conversation: 'conv-hook', from: 'webhook:linear', to: 'god', act: 'inform', m: 9,
    subject: 'Linear · ENG-212 moved to In Review', body: 'Issue **ENG-212** “Sidebar hover cards” moved to *In Review* by a teammate.' },
  { id: 'm12', conversation: 'conv-plan', from: 'dwight-mv2fp3un', to: 'god', act: 'done', m: 6,
    subject: 'PLAN.md updated with MDF-35 answers', body: 'Product name is now “Vajra’s Office”. Office floor stays optional. Teams deferred.' },
  { id: 'm13', conversation: 'conv-tester-q', from: 'tester-mv2fnyz5', to: 'human', act: 'query', m: 3, reply: true, human: true,
    subject: 'Can I test on your device after MDF-11?', body: 'The gallery cannot exercise drag-to-reorder with a trackpad. Could you try it on your Mac for five minutes once it lands?' }
];

export function demoMail(base = Date.now()): PaperMail[] {
  return MAIL.map((m) => ({
    id: m.id,
    conversation: m.conversation,
    inReplyTo: m.re ?? null,
    from: m.from,
    to: m.to,
    act: m.act,
    subject: m.subject,
    body: m.body,
    requiresReply: !!m.reply,
    needsHuman: !!m.human,
    createdAt: at(m.m * MIN, base)
  }));
}
