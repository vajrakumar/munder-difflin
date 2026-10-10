/** Temps (MDF-20) data layer. Live reads workers + SQLite history through
 *  `window.cth`; demo serves a sample floor in the browser gallery. */
import { MS } from '../../data/time';

export type TempResult = 'done' | 'failed' | 'stopped';
export type DateFilter = 'any' | 'today' | '7d' | '30d';
export type ResultFilter = 'all' | TempResult;

export interface LiveTemp {
  id: string;
  name: string;
  objective: string;
  spawnedAt: number;
  tokens: number;
  usd: number;
  tokenCap: number | null;
  slackUrl: string;
  releasing: boolean;
}

export interface HistoryTemp {
  id: string;
  name: string;
  objective: string;
  startedAt: number;
  endedAt: number;
  tokens: number;
  usd: number;
  result: TempResult;
  report: string;
  failureReason: string;
  slackUrl: string;
}

export interface PendingTemp {
  id: string;
  file: string;
  name: string;
  objective: string;
  waitingMs: number;
}

export interface TempsSnapshot {
  live: LiveTemp[];
  history: HistoryTemp[];
  pending: PendingTemp[];
  spawnEnabled: boolean;
  maxWorkers: number;
}

export interface TempsSource {
  mode: 'live' | 'demo';
  snapshot(): Promise<TempsSnapshot>;
  stop(id: string): Promise<{ ok: boolean; error?: string }>;
}

export function fmtTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n < 0.01) return '<$0.01';
  return `$${n.toFixed(n < 10 ? 2 : 1)}`;
}

export function fmtRuntime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 90) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function costLabel(tokens: number, usd: number): string {
  return `${fmtTokens(tokens)} · ${fmtUsd(usd)}`;
}

export function filterHistory(
  rows: HistoryTemp[],
  date: DateFilter,
  result: ResultFilter,
  now = Date.now()
): HistoryTemp[] {
  const start = dateStart(date, now);
  return rows.filter((r) => {
    if (result !== 'all' && r.result !== result) return false;
    if (start != null && r.startedAt < start) return false;
    return true;
  });
}

function dateStart(date: DateFilter, now: number): number | null {
  if (date === 'any') return null;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (date === 'today') return d.getTime();
  if (date === '7d') return now - 7 * MS.DAY;
  return now - 30 * MS.DAY;
}

type Cth = {
  tempsSnapshot(): Promise<{
    live: Array<{
      workerId: string;
      name: string;
      objective?: string;
      spawnedAt: number;
      tokensUsed: number;
      usd?: number;
      tokenCap: number | null;
      slackUrl?: string;
      releasing: boolean;
    }>;
    pending: Array<{ id: string; file: string; name: string; objective: string; waitingMs: number }>;
    history: HistoryTemp[];
    spawnEnabled: boolean;
    maxWorkers: number;
  }>;
  listWorkers(): Promise<{
    live: Array<{
      workerId: string;
      name: string;
      objective?: string;
      spawnedAt: number;
      tokensUsed: number;
      usd?: number;
      tokenCap: number | null;
      slackUrl?: string;
      releasing: boolean;
    }>;
    maxWorkers: number;
  }>;
  listPendingTemps(): Promise<{ pending: PendingTemp[]; spawnEnabled: boolean }>;
  listTempHistory(limit?: number): Promise<HistoryTemp[]>;
  stopWorker(id: string): Promise<{ ok: boolean; error?: string }>;
};

function cth(): Cth | null {
  try {
    const c = (window as { cth?: Partial<Cth> }).cth;
    return c && (typeof c.tempsSnapshot === 'function' || typeof c.listWorkers === 'function') ? (c as Cth) : null;
  } catch {
    return null;
  }
}

function mapLive(w: {
  workerId: string;
  name: string;
  objective?: string;
  spawnedAt: number;
  tokensUsed: number;
  usd?: number;
  tokenCap: number | null;
  slackUrl?: string;
  releasing: boolean;
}): LiveTemp {
  return {
    id: w.workerId,
    name: w.name,
    objective: w.objective ?? '',
    spawnedAt: w.spawnedAt,
    tokens: w.tokensUsed,
    usd: w.usd ?? 0,
    tokenCap: w.tokenCap,
    slackUrl: w.slackUrl ?? '',
    releasing: w.releasing
  };
}

function liveSource(c: Cth): TempsSource {
  return {
    mode: 'live',
    async snapshot() {
      if (typeof c.tempsSnapshot === 'function') {
        const s = await c.tempsSnapshot();
        return {
          live: s.live.map(mapLive),
          history: s.history,
          pending: s.pending,
          spawnEnabled: s.spawnEnabled,
          maxWorkers: s.maxWorkers
        };
      }
      const [workers, pending, history] = await Promise.all([
        c.listWorkers(),
        typeof c.listPendingTemps === 'function' ? c.listPendingTemps() : Promise.resolve({ pending: [], spawnEnabled: true }),
        typeof c.listTempHistory === 'function' ? c.listTempHistory(200) : Promise.resolve([])
      ]);
      return {
        live: workers.live.map(mapLive),
        history,
        pending: pending.pending,
        spawnEnabled: pending.spawnEnabled,
        maxWorkers: workers.maxWorkers
      };
    },
    stop: (id) => c.stopWorker(id)
  };
}

const DEMO_NOW = Date.now();

function demoSource(): TempsSource {
  const live: LiveTemp[] = [
    {
      id: 'worker-temps',
      name: 'Darryl',
      objective: 'Build MDF-20 Temps + Connections gallery screens on feat/mdf-20-temps.',
      spawnedAt: DEMO_NOW - 11 * 60_000,
      tokens: 184_200,
      usd: 1.12,
      tokenCap: 6_000_000,
      slackUrl: '',
      releasing: false
    }
  ];
  const history: HistoryTemp[] = [
    {
      id: 'worker-memory-3',
      name: 'Angela',
      objective: 'Finish the Memory browser (MDF-18): cards, list, graph and knowledge tab.',
      startedAt: DEMO_NOW - 2 * MS.HOUR,
      endedAt: DEMO_NOW - 40 * 60_000,
      tokens: 412_000,
      usd: 2.40,
      result: 'done',
      report: 'Memory screen on feat/mdf-18-memory, head 56840c5c. Preview http://127.0.0.1:5183/paper.html#/memory',
      failureReason: '',
      slackUrl: 'https://slack.com/archives/C01234567/p1770000000000100'
    },
    {
      id: 'worker-automations',
      name: 'Andy',
      objective: 'Build Automations (MDF-17) on feat/mdf-17-automations.',
      startedAt: DEMO_NOW - 26 * MS.HOUR,
      endedAt: DEMO_NOW - 25 * MS.HOUR,
      tokens: 8_200_000,
      usd: 11.4,
      result: 'failed',
      report: '',
      failureReason: 'idle 20 min — never signaled done',
      slackUrl: ''
    },
    {
      id: 'worker-ui-inbox-tasks',
      name: 'Kelly',
      objective: 'Unified Inbox (MDF-15) and Tasks (MDF-16).',
      startedAt: DEMO_NOW - 5 * MS.HOUR,
      endedAt: DEMO_NOW - 4.7 * MS.HOUR,
      tokens: 1_100_000,
      usd: 3.10,
      result: 'stopped',
      report: '',
      failureReason: '',
      slackUrl: ''
    }
  ];
  const pending: PendingTemp[] = [
    {
      id: 'mdf-21-stapler',
      file: 'mdf-21-stapler.json',
      name: 'Stapler',
      objective: 'Build the Stapler capture ring (MDF-21) once Autonomy is on.',
      waitingMs: 18 * 60_000
    }
  ];
  let spawnEnabled = false;

  return {
    mode: 'demo',
    async snapshot() {
      return {
        live: live.map((t) => ({ ...t })),
        history: history.map((t) => ({ ...t })),
        pending: spawnEnabled ? [] : pending.map((t) => ({ ...t })),
        spawnEnabled,
        maxWorkers: 4
      };
    },
    async stop(id) {
      const i = live.findIndex((t) => t.id === id);
      if (i < 0) return { ok: false, error: 'no such live worker' };
      const t = live.splice(i, 1)[0];
      history.unshift({
        id: t.id,
        name: t.name,
        objective: t.objective,
        startedAt: t.spawnedAt,
        endedAt: Date.now(),
        tokens: t.tokens,
        usd: t.usd,
        result: 'stopped',
        report: '',
        failureReason: '',
        slackUrl: t.slackUrl
      });
      spawnEnabled = spawnEnabled;
      return { ok: true };
    }
  };
}

let cached: TempsSource | null = null;

export function tempsSource(): TempsSource {
  if (!cached) {
    const c = cth();
    cached = c ? liveSource(c) : demoSource();
  }
  return cached;
}
