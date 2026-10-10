/** Automations data (MDF-17): schedules, webhooks, the context trigger and the
 *  trigger ledger, read through the existing `window.cth` IPC. In the browser
 *  gallery there is no bridge, so a demo store serves fixtures and applies the
 *  same guard rules main applies (shared/automationGuard), keeping the screen
 *  fully interactive in `npm run gallery`. */
import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_CONTEXT_TRIGGER, DEFAULT_WEBHOOK_SCHEMA, validateAgainstSchema,
  type ContextTriggerConfig, type TriggerHistoryEntry, type WebhookTrigger
} from '@shared/triggers';
import { evaluateGuards, startOfLocalDay, type AutomationGuards } from '@shared/automationGuard';
import { formatMinute, nextWeeklyFireMs, normalizeWeekly } from '@shared/weeklySchedule';
import {
  generateWebhookSecret, getContextTrigger, listWebhooks, newWebhook, saveWebhooks,
  deleteWebhook as deleteWebhookIpc, setContextTrigger, webhooksStatus
} from '../../../components/triggers/api';

export interface Mission {
  id: string;
  label: string;
  intervalMs: number;
  weekly?: { days: number[]; minute: number };
  guards?: AutomationGuards;
  to: string;
  body: string;
  enabled: boolean;
  autoCompact?: boolean;
  lastFiredAt?: number;
  kind?: 'dispatch' | 'heartbeat' | 'compact';
  quietThresholdMs?: number;
}

export type Webhook = WebhookTrigger;
export type HistoryEntry = TriggerHistoryEntry;
export type AutoKind = 'schedule' | 'webhook' | 'context';
export type Filter = 'all' | 'schedules' | 'webhooks' | 'history';

export interface AutoRow {
  key: string;
  kind: AutoKind;
  id: string;
  name: string;
  /** Schedules: next run instant. */
  nextMs?: number;
  /** Schedules: human cadence; context: cadence. */
  cadence?: string;
  /** Webhooks: public URL ('' until a tunnel exists). */
  url?: string;
  last?: HistoryEntry;
  lastFiredAt?: number;
  enabled: boolean;
}

export interface AutomationsState {
  mode: 'live' | 'demo';
  loaded: boolean;
  /** Name of the IPC call that failed, shown with Retry. */
  error?: string;
  missions: Mission[];
  webhooks: Webhook[];
  urls: Record<string, string>;
  context: ContextTriggerConfig;
  history: HistoryEntry[];
}

/* ───────────────────────────── pure helpers ──────────────────────────────── */

/** The next `n` run instants for a schedule, or [] when it cannot run. */
export function nextRuns(m: Pick<Mission, 'weekly' | 'intervalMs' | 'lastFiredAt'>, nowMs: number, n = 3): number[] {
  const out: number[] = [];
  const weekly = normalizeWeekly(m.weekly);
  if (weekly) {
    let t = nowMs;
    for (let i = 0; i < n; i++) {
      const next = nextWeeklyFireMs(weekly, t);
      if (next === null) break;
      out.push(next);
      t = next;
    }
    return out;
  }
  if (!(m.intervalMs > 0)) return out;
  let next = Math.max(nowMs, (m.lastFiredAt ?? 0) + m.intervalMs);
  for (let i = 0; i < n; i++) { out.push(next); next += m.intervalMs; }
  return out;
}

export function cadenceOf(m: Mission, weekday: string[], every: (min: number) => string): string {
  const w = normalizeWeekly(m.weekly);
  if (w) {
    const key = w.days.join(',');
    const days = key === '0,1,2,3,4,5,6' ? '*' : key === '1,2,3,4,5' ? `${weekday[1]}–${weekday[5]}` : w.days.map((d) => weekday[d]).join(', ');
    return `${days} ${formatMinute(w.minute)}`;
  }
  return every(Math.round(m.intervalMs / 60000));
}

export function buildRows(s: AutomationsState, nowMs: number, labels: {
  weekday: string[]; every: (min: number) => string; compact: string; clear: string;
}): AutoRow[] {
  const lastFor = (source: HistoryEntry['source'], id: string): HistoryEntry | undefined =>
    s.history.find((e) => e.source === source && e.sourceId === id && e.direction === 'inbound');
  const rows: AutoRow[] = [];
  for (const m of s.missions) {
    if (m.kind === 'heartbeat') continue; // the floor's own pulse, not a user automation
    rows.push({
      key: `schedule:${m.id}`, kind: 'schedule', id: m.id, name: m.label,
      nextMs: m.enabled ? nextRuns(m, nowMs, 1)[0] : undefined,
      cadence: cadenceOf(m, labels.weekday, labels.every),
      last: lastFor('schedule', m.id), lastFiredAt: m.lastFiredAt, enabled: m.enabled
    });
  }
  for (const w of s.webhooks) {
    rows.push({
      key: `webhook:${w.id}`, kind: 'webhook', id: w.id, name: w.name,
      url: s.urls[w.id] ?? '', last: lastFor('webhook', w.id), enabled: w.enabled
    });
  }
  (['compact', 'clear'] as const).forEach((k) => {
    const rule = s.context[k];
    rows.push({
      key: `context:${k}`, kind: 'context', id: k, name: k === 'compact' ? labels.compact : labels.clear,
      cadence: labels.every(Math.round(rule.everyMs / 60000)), enabled: rule.enabled
    });
  });
  return rows;
}

export function inFilter(r: AutoRow, f: Filter): boolean {
  if (f === 'schedules') return r.kind === 'schedule';
  if (f === 'webhooks') return r.kind === 'webhook';
  return true;
}

export function badgeTone(decision: string | undefined): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  switch (decision) {
    case 'auto-allowed': case 'approved': return 'success';
    case 'pending': return 'accent';
    case 'skipped:quiet': case 'skipped:cap': case 'dry-run': return 'warning';
    case 'rejected': case 'invalid': return 'danger';
    default: return 'neutral';
  }
}

export type PresetId = 'custom' | 'github' | 'linear' | 'telegram';

/** Starting points for a webhook. Every preset keeps `message` (the one field
 *  the router needs); the sample is what the Test button sends. */
export const PRESETS: Record<PresetId, { schema: string; sample: string }> = {
  custom: {
    schema: DEFAULT_WEBHOOK_SCHEMA,
    sample: JSON.stringify({ message: 'Nightly export finished', title: 'Export', kind: 'communication', from: 'cron' }, null, 2)
  },
  github: {
    schema: JSON.stringify({ type: 'object', required: ['message'], properties: {
      message: { type: 'string' }, title: { type: 'string' }, repo: { type: 'string' }, from: { type: 'string' }
    } }, null, 2),
    sample: JSON.stringify({ message: 'PR #42 opened: fix login redirect', title: 'GitHub PR', repo: 'acme/web', from: 'github' }, null, 2)
  },
  linear: {
    schema: JSON.stringify({ type: 'object', required: ['message'], properties: {
      message: { type: 'string' }, title: { type: 'string' }, issue: { type: 'string' }, from: { type: 'string' }
    } }, null, 2),
    sample: JSON.stringify({ message: 'ENG-311 moved to In Review', title: 'Linear issue', issue: 'ENG-311', from: 'linear' }, null, 2)
  },
  telegram: {
    schema: JSON.stringify({ type: 'object', required: ['message'], properties: {
      message: { type: 'string' }, chat: { type: 'string' }, from: { type: 'string' }
    } }, null, 2),
    sample: JSON.stringify({ message: 'Can someone check the build?', chat: 'ops', from: 'telegram', kind: 'directive' }, null, 2)
  }
};

/* ──────────────────────────────── store ──────────────────────────────────── */

function bridge(): Window['cth'] | undefined {
  try {
    const c = (window as { cth?: Window['cth'] }).cth;
    return c && typeof c.listMissions === 'function' && typeof c.listTriggerHistory === 'function' ? c : undefined;
  } catch {
    return undefined;
  }
}

const HOUR = 3_600_000;

function demoState(): AutomationsState {
  const now = Date.now();
  const missions: Mission[] = [
    { id: 'ops-standup', label: 'Ops standup', intervalMs: HOUR, to: 'god', body: 'Post the hourly floor standup.', enabled: true, lastFiredAt: now - 20 * 60000 },
    {
      id: 'morning-digest', label: 'Morning digest', intervalMs: 0, weekly: { days: [1, 2, 3, 4, 5], minute: 540 },
      to: 'dwight-mv2fp3un', body: 'Summarise yesterday’s merged work for the board.', enabled: true,
      guards: { quietHours: { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60 }, guardrails: { maxRunsPerDay: 1, maxTokensPerRun: 40000 } }
    },
    { id: 'weekly-audit', label: 'Weekly npm audit', intervalMs: 0, weekly: { days: [1], minute: 600 }, to: 'phyllis-mv2fq1rq', body: 'Run npm audit and file cards.', enabled: false }
  ];
  const webhooks: Webhook[] = [
    { id: 'wh-github', name: 'GitHub PRs', secret: 'f3a9'.repeat(16), enabled: true, mode: 'communication-only', schema: PRESETS.github.schema, createdAt: now - 5 * 86400000 }
  ];
  const e = (p: Partial<HistoryEntry> & Pick<HistoryEntry, 'source' | 'sourceId' | 'sourceName' | 'body'>, ago: number): HistoryEntry => ({
    id: `demo-${Math.random().toString(36).slice(2, 10)}`, direction: 'inbound', peer: p.sourceName, kind: 'directive',
    at: now - ago, ...p
  });
  const history: HistoryEntry[] = [
    e({ source: 'schedule', sourceId: 'ops-standup', sourceName: 'Ops standup', body: 'Post the hourly floor standup.', decision: 'auto-allowed', title: 'Ops standup' }, 20 * 60000),
    e({ source: 'webhook', sourceId: 'wh-github', sourceName: 'GitHub PRs', body: 'Deploy the hotfix branch to staging', decision: 'pending', title: 'Deploy request', peer: 'github' }, 45 * 60000),
    e({ source: 'schedule', sourceId: 'morning-digest', sourceName: 'Morning digest', body: 'Summarise yesterday’s merged work for the board.', decision: 'skipped:quiet', title: 'Morning digest' }, 9 * HOUR),
    e({ source: 'webhook', sourceId: 'wh-github', sourceName: 'GitHub PRs', body: 'missing required field "message"', decision: 'invalid', title: 'invalid', kind: 'communication' }, 26 * HOUR)
  ];
  return {
    mode: 'demo', loaded: true, missions, webhooks,
    urls: { 'wh-github': 'https://quiet-river-1234.trycloudflare.com/wh-github' },
    context: { ...DEFAULT_CONTEXT_TRIGGER, compact: { ...DEFAULT_CONTEXT_TRIGGER.compact, enabled: true } },
    history
  };
}

async function loadLive(c: Window['cth']): Promise<AutomationsState> {
  const step = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    try { return await fn(); } catch { throw new Error(name); }
  };
  const [missions, webhooks, status, context, history] = await Promise.all([
    step('missions:list', () => c.listMissions()),
    step('webhooks:list', async () => {
      const list = await listWebhooks();
      if (!list) throw new Error('webhooks:list');
      return list;
    }),
    webhooksStatus(),
    getContextTrigger(),
    step('triggerHistory:list', () => c.listTriggerHistory())
  ]);
  const urls: Record<string, string> = {};
  for (const ep of status.endpoints ?? []) urls[ep.id] = ep.url;
  return { mode: 'live', loaded: true, missions: (missions ?? []) as Mission[], webhooks, urls, context, history: history ?? [] };
}

export interface TestOutcome { status: number; error?: string }

export interface AutomationsApi {
  state: AutomationsState;
  reload: () => void;
  saveMission: (m: Mission) => Promise<boolean>;
  deleteMission: (id: string) => Promise<boolean>;
  saveWebhook: (w: Webhook) => Promise<boolean>;
  deleteWebhook: (id: string) => Promise<boolean>;
  createWebhook: () => Promise<Webhook>;
  newSecret: () => Promise<string>;
  toggle: (row: AutoRow) => Promise<boolean>;
  testWebhook: (id: string, payload: string) => Promise<TestOutcome>;
  decide: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
  clearHistory: () => Promise<void>;
}

const EMPTY: AutomationsState = {
  mode: 'live', loaded: false, missions: [], webhooks: [], urls: {}, context: DEFAULT_CONTEXT_TRIGGER, history: []
};

export function useAutomations(): AutomationsApi {
  const c = bridge();
  const [state, setState] = useState<AutomationsState>(() => (c ? EMPTY : demoState()));

  const reload = useCallback(() => {
    const live = bridge();
    if (!live) return;
    setState((s) => ({ ...s, error: undefined }));
    loadLive(live)
      .then((next) => setState(next))
      .catch((e: unknown) => setState((s) => ({ ...s, loaded: true, error: e instanceof Error ? e.message : String(e) })));
  }, []);

  useEffect(() => {
    if (!c) return;
    reload();
    const offs = [c.onMissionsUpdated?.(reload), c.onTriggerHistoryUpdated?.(reload)];
    return () => offs.forEach((off) => off?.());
  }, [c, reload]);

  const demoPatch = (fn: (s: AutomationsState) => AutomationsState): Promise<boolean> => {
    setState(fn);
    return Promise.resolve(true);
  };

  const saveMissions = async (list: Mission[]): Promise<boolean> => {
    if (!c) return demoPatch((s) => ({ ...s, missions: list }));
    try {
      const r = await c.saveMissions(list);
      reload();
      return r.ok;
    } catch { return false; }
  };

  const saveMission = (m: Mission): Promise<boolean> => {
    const exists = state.missions.some((x) => x.id === m.id);
    return saveMissions(exists ? state.missions.map((x) => (x.id === m.id ? m : x)) : [...state.missions, m]);
  };

  const deleteMission = (id: string): Promise<boolean> => saveMissions(state.missions.filter((m) => m.id !== id));

  const saveWebhook = async (w: Webhook): Promise<boolean> => {
    const list = state.webhooks.some((x) => x.id === w.id)
      ? state.webhooks.map((x) => (x.id === w.id ? w : x))
      : [...state.webhooks, w];
    if (!c) {
      return demoPatch((s) => ({
        ...s, webhooks: list,
        urls: { ...s.urls, [w.id]: s.urls[w.id] || `https://quiet-river-1234.trycloudflare.com/${w.id}` }
      }));
    }
    const saved = await saveWebhooks(list);
    reload();
    return !!saved;
  };

  const deleteWebhook = async (id: string): Promise<boolean> => {
    if (!c) return demoPatch((s) => ({ ...s, webhooks: s.webhooks.filter((w) => w.id !== id) }));
    const r = await deleteWebhookIpc(id);
    reload();
    return !!r;
  };

  const newSecret = (): Promise<string> => generateWebhookSecret();

  const createWebhook = async (): Promise<Webhook> => newWebhook(await newSecret(), state.webhooks.length);

  const toggle = async (row: AutoRow): Promise<boolean> => {
    if (row.kind === 'schedule') {
      const m = state.missions.find((x) => x.id === row.id);
      return m ? saveMission({ ...m, enabled: !m.enabled }) : false;
    }
    if (row.kind === 'webhook') {
      const w = state.webhooks.find((x) => x.id === row.id);
      return w ? saveWebhook({ ...w, enabled: !w.enabled }) : false;
    }
    const k = row.id as 'compact' | 'clear';
    const next: ContextTriggerConfig = { ...state.context, [k]: { ...state.context[k], enabled: !state.context[k].enabled } };
    setState((s) => ({ ...s, context: next }));
    if (c) setContextTrigger(next);
    return true;
  };

  const testWebhook = async (id: string, payload: string): Promise<TestOutcome> => {
    if (c) {
      try {
        const r = await c.testWebhook(id, payload);
        reload();
        return { status: r.status, error: r.error };
      } catch (e) {
        return { status: 0, error: e instanceof Error ? e.message : String(e) };
      }
    }
    // Demo: the same order main uses — schema, then guards, then route.
    const w = state.webhooks.find((x) => x.id === id);
    if (!w) return { status: 0, error: 'unknown webhook' };
    if (!w.enabled) return { status: 0, error: 'turn the webhook on to test it' };
    const add = (decision: HistoryEntry['decision'], body: string): void => setState((s) => ({
      ...s,
      history: [{
        id: `demo-${Date.now().toString(36)}`, source: 'webhook', sourceId: w.id, sourceName: w.name, direction: 'inbound',
        peer: 'test', title: 'Test', body, kind: 'communication', decision, at: Date.now()
      }, ...s.history]
    }));
    let parsed: unknown;
    try { parsed = JSON.parse(payload); } catch { return { status: 400, error: 'bad json' }; }
    let schema: unknown = {};
    try { schema = JSON.parse(w.schema); } catch { /* accept */ }
    const check = validateAgainstSchema(parsed, schema);
    if (!check.ok) { add('invalid', check.error); return { status: 400, error: check.error }; }
    const since = startOfLocalDay(Date.now());
    const runs = state.history.filter((e) => e.sourceId === w.id && e.at >= since && e.decision === 'auto-allowed').length;
    const v = evaluateGuards(w.guards, Date.now(), runs);
    const message = String((parsed as { message?: unknown }).message ?? '');
    if (v.action === 'skip') { add(`skipped:${v.reason}`, message); return { status: v.reason === 'quiet' ? 503 : 429 }; }
    if (v.action === 'dry-run') { add('dry-run', message); return { status: 200 }; }
    add('auto-allowed', message);
    return { status: 200 };
  };

  const decide = async (id: string, decision: 'approved' | 'rejected'): Promise<void> => {
    if (!c) {
      setState((s) => ({ ...s, history: s.history.map((e) => (e.id === id ? { ...e, decision } : e)) }));
      return;
    }
    try { await c.decideTriggerHistory({ id, decision }); } catch { /* the row stays pending */ }
    reload();
  };

  const clearHistory = async (): Promise<void> => {
    if (!c) { setState((s) => ({ ...s, history: [] })); return; }
    try { await c.clearTriggerHistory(); } catch { /* keep */ }
    reload();
  };

  return {
    state, reload, saveMission, deleteMission, saveWebhook, deleteWebhook, createWebhook,
    newSecret, toggle, testWebhook, decide, clearHistory
  };
}

export function newMission(to: string): Mission {
  return {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label: 'New schedule', intervalMs: 0, weekly: { days: [1, 2, 3, 4, 5], minute: 540 },
    to, body: '', enabled: true
  };
}
