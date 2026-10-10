/** Automations (MDF-17): schedules, webhooks and the context trigger in one
 *  table, an editor sheet with quiet hours and guardrails, and the trigger
 *  ledger as History. Keys: n, Shift+N, Space, h, j/k, Enter, t (in editor). */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Check, Copy as CopyIcon, Eye, EyeOff, Gauge, RefreshCw, Trash2, Webhook as WebhookIcon, Zap } from 'lucide-react';
import {
  Badge, Button, Combobox, EmptyState, IconButton, Input, Kbd, Label, Select, Sheet, SheetContent,
  Skeleton, Table, TBody, TD, TH, THead, TR, Tabs, TabsList, TabsTrigger, ToastProvider, Tooltip, cx, useToast
} from '@/ui';
import { normalizeGuards, parseSchedulePhrase, type AutomationGuards } from '@shared/automationGuard';
import { formatMinute } from '@shared/weeklySchedule';
import { useFloor } from '../../data/hive';
import { fullStamp, relative } from '../../data/time';
import type { PaperRoute } from '../../routes';
import { copyFor, currentLang, type Copy } from './copy';
import {
  badgeTone, buildRows, inFilter, newMission, nextRuns, PRESETS, useAutomations,
  type AutoRow, type AutomationsApi, type Filter, type HistoryEntry, type Mission, type PresetId, type Webhook
} from './model';
import '../../common/common.css';
import './automations.css';

export const route: PaperRoute = 'automations';

const JsonEditor = lazy(() => import('../../../components/triggers/JsonEditor').then((m) => ({ default: m.JsonEditor })));

const KIND_ICON = { schedule: CalendarClock, webhook: WebhookIcon, context: Gauge } as const;

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable
    || !!n.closest?.('.cm-editor'));
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }): JSX.Element {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="pa-switch"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      <span className="pa-switch-knob" />
    </button>
  );
}

type Editing = { kind: 'schedule'; draft: Mission } | { kind: 'webhook'; draft: Webhook } | null;

export function Screen(): JSX.Element {
  return (
    <ToastProvider>
      <AutomationsScreen />
    </ToastProvider>
  );
}

function AutomationsScreen(): JSX.Element {
  const lang = currentLang();
  const t = useMemo(() => copyFor(lang), [lang]);
  const api = useAutomations();
  const { state } = api;
  const floor = useFloor();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState<Editing>(null);
  const [now, setNow] = useState(() => Date.now());
  const tableRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(
    () => buildRows(state, now, { weekday: t.weekday, every: t.every, compact: t.contextCompact, clear: t.contextClear }),
    [state, now, t]
  );
  const visible = useMemo(() => rows.filter((r) => inFilter(r, filter)), [rows, filter]);
  const userRows = rows.filter((r) => r.kind !== 'context');
  const sel = visible[Math.min(selected, visible.length - 1)];

  const openRow = useCallback((r: AutoRow | undefined) => {
    if (!r) return;
    if (r.kind === 'schedule') {
      const m = state.missions.find((x) => x.id === r.id);
      if (m) setEditing({ kind: 'schedule', draft: { ...m } });
    } else if (r.kind === 'webhook') {
      const w = state.webhooks.find((x) => x.id === r.id);
      if (w) setEditing({ kind: 'webhook', draft: { ...w } });
    }
  }, [state.missions, state.webhooks]);

  const startSchedule = useCallback(() => {
    const first = floor.agents[0]?.id ?? 'god';
    setEditing({ kind: 'schedule', draft: newMission(floor.agents.some((a) => a.id === 'god') ? 'god' : first) });
  }, [floor.agents]);

  const startWebhook = useCallback(() => {
    void api.createWebhook().then((w) => setEditing({ kind: 'webhook', draft: w }));
  }, [api]);

  const toggleRow = useCallback((r: AutoRow | undefined) => {
    if (!r) return;
    void api.toggle(r).then((ok) => { if (!ok) toast(t.saveFailed); });
  }, [api, toast, t]);

  // Screen keys. Off while a sheet is open (it owns Esc and `t`) or while typing.
  useEffect(() => {
    if (editing) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'N' && e.shiftKey) { e.preventDefault(); startWebhook(); return; }
      if (e.key === 'n') { e.preventDefault(); startSchedule(); return; }
      if (e.key === 'h') { e.preventDefault(); setFilter('history'); return; }
      if (filter === 'history') return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSelected((i) => Math.min(visible.length - 1, i + 1)); }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSelected((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') { if ((e.target as HTMLElement)?.closest?.('button')) return; e.preventDefault(); openRow(sel); }
      else if (e.key === ' ') { if ((e.target as HTMLElement)?.closest?.('button')) return; e.preventDefault(); toggleRow(sel); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, filter, visible.length, sel, openRow, toggleRow, startSchedule, startWebhook]);

  useEffect(() => {
    const el = tableRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);

  const agentOptions = useMemo(() => {
    const opts = floor.agents.map((a) => ({ value: a.id, label: a.name === a.id ? a.id : `${a.name} (${a.id})` }));
    if (!opts.some((o) => o.value === 'god')) opts.unshift({ value: 'god', label: 'god' });
    return opts;
  }, [floor.agents]);

  const iso = (ms: number): string => new Date(ms).toISOString();

  return (
    <div className="pc-screen pa-root" dir={lang === 'ar' ? 'rtl' : undefined} lang={lang}>
      <header className="pa-head">
        <div>
          <h1 className="pa-title">{t.title}</h1>
          <p className="pa-sub">{t.subtitle}</p>
        </div>
        <div className="pa-head-actions">
          <Tooltip content={state.mode === 'demo' ? t.demoHint : t.live}>
            <Badge tone={state.mode === 'demo' ? 'warning' : 'success'}>{state.mode === 'demo' ? t.demo : t.live}</Badge>
          </Tooltip>
          <Button variant="secondary" size="sm" onClick={startWebhook}><WebhookIcon size={14} /> {t.newWebhook} <Kbd>⇧N</Kbd></Button>
          <Button variant="primary" size="sm" onClick={startSchedule}><CalendarClock size={14} /> {t.newSchedule} <Kbd>N</Kbd></Button>
        </div>
      </header>

      <Tabs value={filter} onValueChange={(v) => { setFilter(v as Filter); setSelected(0); }}>
        <TabsList aria-label={t.filterLabel} className="pa-filter">
          {(['all', 'schedules', 'webhooks', 'history'] as Filter[]).map((f) => (
            <TabsTrigger key={f} value={f} data-pa-filter={f}>{t.filters[f]}{f === 'history' && <Kbd>H</Kbd>}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="pa-body">
        {!state.loaded ? (
          <div className="pa-skeleton" aria-busy="true" aria-label={t.loading}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 36, width: '100%' }} />)}
          </div>
        ) : state.error ? (
          <EmptyState title={t.error(state.error)} action={<Button onClick={api.reload}><RefreshCw size={14} /> {t.retry}</Button>} />
        ) : filter === 'history' ? (
          <History t={t} api={api} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={userRows.length === 0 ? <Zap size={20} /> : undefined}
            title={userRows.length === 0 ? t.empty.title : t.emptyFiltered.title}
            description={userRows.length === 0 ? t.empty.body : t.emptyFiltered.body}
            action={userRows.length === 0 ? (
              <div className="pa-row-actions">
                <Button onClick={startSchedule}>{t.newSchedule}</Button>
                <Button variant="secondary" onClick={startWebhook}>{t.newWebhook}</Button>
              </div>
            ) : undefined}
          />
        ) : (
          <>
            {userRows.length === 0 && (
              <EmptyState
                icon={<Zap size={20} />}
                title={t.empty.title}
                description={t.empty.body}
                action={<div className="pa-row-actions">
                  <Button onClick={startSchedule}>{t.newSchedule}</Button>
                  <Button variant="secondary" onClick={startWebhook}>{t.newWebhook}</Button>
                </div>}
              />
            )}
            {visible.length > 0 && (
              <Table className="pa-table">
                <THead>
                  <TR>
                    <TH>{t.cols.name}</TH><TH>{t.cols.type}</TH><TH>{t.cols.next}</TH><TH>{t.cols.last}</TH><TH>{t.cols.on}</TH>
                  </TR>
                </THead>
                <TBody ref={tableRef}>
                  {visible.map((r, i) => {
                    const Icon = KIND_ICON[r.kind];
                    return (
                      <TR key={r.key} data-index={i} aria-selected={i === selected}
                        className={cx('pa-tr', i === selected && 'is-selected', r.kind === 'context' && 'is-context')}
                        onClick={() => { setSelected(i); openRow(r); }}>
                        <TD>
                          {r.kind === 'context' ? <span className="pa-name">{r.name}</span> : (
                            <button type="button" className="pa-name pa-link" aria-label={t.edit(r.name)}
                              onClick={(e) => { e.stopPropagation(); setSelected(i); openRow(r); }}>{r.name}</button>
                          )}
                        </TD>
                        <TD><span className="pa-type"><Icon size={13} aria-hidden /> {t.types[r.kind]}</span></TD>
                        <TD className="pa-next">
                          {r.kind === 'webhook'
                            ? (r.url ? <code className="pa-url" title={r.url}>{r.url}</code> : <span className="pa-muted">{t.noUrl}</span>)
                            : <>
                              <span>{r.cadence}</span>
                              {r.nextMs ? <span className="pa-muted" title={fullStamp(iso(r.nextMs))}> · {fullStamp(iso(r.nextMs))}</span> : null}
                            </>}
                        </TD>
                        <TD>
                          {r.last ? (
                            <span className="pa-last">
                              <Badge tone={badgeTone(r.last.decision)}>{t.status[r.last.decision ?? 'sent'] ?? r.last.decision}</Badge>
                              <span className="pa-muted" title={fullStamp(iso(r.last.at))}>{relative(iso(r.last.at))}</span>
                            </span>
                          ) : r.lastFiredAt ? <span className="pa-muted">{relative(iso(r.lastFiredAt))}</span>
                            : <span className="pa-muted">{r.kind === 'context' ? '—' : t.never}</span>}
                        </TD>
                        <TD><Switch on={r.enabled} label={t.toggle(r.name)} onToggle={() => toggleRow(r)} /></TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </>
        )}
      </div>

      <footer className="pa-keys" aria-hidden>
        <span><Kbd>J</Kbd><Kbd>K</Kbd> {t.keys.move}</span>
        <span><Kbd>N</Kbd> {t.keys.schedule}</span>
        <span><Kbd>⇧N</Kbd> {t.keys.webhook}</span>
        <span><Kbd>Space</Kbd> {t.keys.toggle}</span>
        <span><Kbd>H</Kbd> {t.keys.history}</span>
      </footer>

      <Sheet open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        {editing?.kind === 'schedule' && (
          <SheetContent title={t.editSchedule} className="paper-sheet-wide">
            <ScheduleEditor t={t} api={api} draft={editing.draft} agents={agentOptions} now={now}
              onDone={() => setEditing(null)} />
          </SheetContent>
        )}
        {editing?.kind === 'webhook' && (
          <SheetContent title={t.editWebhook} className="paper-sheet-wide">
            <WebhookEditor t={t} api={api} draft={editing.draft} url={state.urls[editing.draft.id] ?? ''}
              onDone={() => setEditing(null)} />
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}

/* ───────────────────────────── guards block ──────────────────────────────── */

function toHHMM(min: number): string { return formatMinute(min); }
function fromHHMM(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
}

function GuardsFields({ t, value, onChange }: {
  t: Copy; value: AutomationGuards | undefined; onChange: (g: AutomationGuards) => void;
}): JSX.Element {
  const q = value?.quietHours ?? { enabled: false, startMinute: 22 * 60, endMinute: 7 * 60 };
  const g = value?.guardrails ?? {};
  const set = (next: AutomationGuards): void => onChange({ ...value, ...next });
  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Math.max(0, Math.floor(Number(v)) || 0));
  return (
    <>
      <fieldset className="pa-fieldset">
        <legend>{t.quiet}</legend>
        <label className="pa-check">
          <input type="checkbox" checked={q.enabled} onChange={(e) => set({ quietHours: { ...q, enabled: e.target.checked } })} />
          {t.quiet}
        </label>
        <div className="pa-inline">
          <Label htmlFor="pa-q-from">{t.quietFrom}</Label>
          <Input id="pa-q-from" type="time" value={toHHMM(q.startMinute)} disabled={!q.enabled}
            onChange={(e) => set({ quietHours: { ...q, startMinute: fromHHMM(e.target.value) } })} />
          <Label htmlFor="pa-q-to">{t.quietTo}</Label>
          <Input id="pa-q-to" type="time" value={toHHMM(q.endMinute)} disabled={!q.enabled}
            onChange={(e) => set({ quietHours: { ...q, endMinute: fromHHMM(e.target.value) } })} />
        </div>
        <p className="pa-hint">{t.quietHint}</p>
      </fieldset>
      <fieldset className="pa-fieldset">
        <legend>{t.guardrails}</legend>
        <div className="pa-grid2">
          <Label htmlFor="pa-g-runs">{t.maxRuns}</Label>
          <Input id="pa-g-runs" type="number" min={0} inputMode="numeric" placeholder={t.noLimit}
            value={g.maxRunsPerDay ?? ''} onChange={(e) => set({ guardrails: { ...g, maxRunsPerDay: num(e.target.value) } })} />
          <Label htmlFor="pa-g-tokens">{t.maxTokens}</Label>
          <Input id="pa-g-tokens" type="number" min={0} step={1000} inputMode="numeric" placeholder={t.noLimit}
            value={g.maxTokensPerRun ?? ''} onChange={(e) => set({ guardrails: { ...g, maxTokensPerRun: num(e.target.value) } })} />
        </div>
        <label className="pa-check">
          <input type="checkbox" checked={!!g.dryRun} onChange={(e) => set({ guardrails: { ...g, dryRun: e.target.checked } })} />
          {t.dryRun}
        </label>
      </fieldset>
    </>
  );
}

/* ──────────────────────────── schedule editor ────────────────────────────── */

function ScheduleEditor({ t, api, draft: initial, agents, now, onDone }: {
  t: Copy; api: AutomationsApi; draft: Mission; agents: Array<{ value: string; label: string }>; now: number; onDone: () => void;
}): JSX.Element {
  const toast = useToast();
  const [d, setD] = useState<Mission>(initial);
  const [phrase, setPhrase] = useState('');
  const [phraseBad, setPhraseBad] = useState(false);
  const weekly = d.weekly ?? { days: [], minute: 540 };
  const runs = nextRuns({ ...d, weekly, intervalMs: weekly.days.length ? 0 : d.intervalMs }, now, 3);
  const isNew = !api.state.missions.some((m) => m.id === d.id);

  const applyPhrase = (): void => {
    const p = parseSchedulePhrase(phrase);
    setPhraseBad(!p && phrase.trim() !== '');
    if (p) setD((x) => ({ ...x, weekly: p }));
  };
  const toggleDay = (day: number): void => setD((x) => {
    const days = (x.weekly?.days ?? []).includes(day) ? (x.weekly?.days ?? []).filter((v) => v !== day) : [...(x.weekly?.days ?? []), day];
    return { ...x, weekly: { minute: x.weekly?.minute ?? 540, days: days.sort((a, b) => a - b) } };
  });
  const save = async (): Promise<void> => {
    const ok = await api.saveMission({ ...d, guards: normalizeGuards(d.guards) });
    toast(ok ? t.saved : t.saveFailed);
    if (ok) onDone();
  };

  return (
    <form className="pa-sheet-body" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Label htmlFor="pa-s-name">{t.name}</Label>
      <Input id="pa-s-name" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} />
      <Label>{t.target}</Label>
      <Combobox aria-label={t.target} options={agents} value={d.to} placeholder={t.targetPlaceholder}
        onChange={(v) => setD({ ...d, to: v })} />
      <Label htmlFor="pa-s-body">{t.message}</Label>
      <textarea id="pa-s-body" className="pa-textarea" rows={3} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />

      <Label htmlFor="pa-s-phrase">{t.phrase}</Label>
      <Input id="pa-s-phrase" value={phrase} placeholder={t.phrasePlaceholder}
        aria-invalid={phraseBad || undefined} aria-describedby={phraseBad ? 'pa-s-phrase-err' : undefined}
        onChange={(e) => setPhrase(e.target.value)} onBlur={applyPhrase}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPhrase(); } }} />
      {phraseBad && <p id="pa-s-phrase-err" className="pa-hint pa-err" role="alert">{t.phraseNoMatch}</p>}

      <fieldset className="pa-fieldset">
        <legend>{t.days}</legend>
        <div className="pa-days">
          {t.weekday.map((w, i) => (
            <button key={i} type="button" className="pa-day" aria-pressed={weekly.days.includes(i)} onClick={() => toggleDay(i)}>{w}</button>
          ))}
        </div>
        <div className="pa-inline">
          <Label htmlFor="pa-s-time">{t.time}</Label>
          <Input id="pa-s-time" type="time" value={formatMinute(weekly.minute)}
            onChange={(e) => setD({ ...d, weekly: { ...weekly, minute: fromHHMM(e.target.value) } })} />
        </div>
      </fieldset>

      <div className="pa-preview" aria-live="polite">
        <strong>{t.nextRuns}</strong>
        {runs.length ? <ol>{runs.map((r) => <li key={r}>{fullStamp(new Date(r).toISOString())}</li>)}</ol> : <p className="pa-hint">{t.noNextRuns}</p>}
      </div>

      <GuardsFields t={t} value={d.guards} onChange={(g) => setD({ ...d, guards: g })} />

      <label className="pa-check">
        <input type="checkbox" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} /> {t.enabled}
      </label>

      <div className="pa-sheet-actions">
        {!isNew && (
          <Button type="button" variant="danger" size="sm"
            onClick={() => void api.deleteMission(d.id).then((ok) => { toast(ok ? t.removed : t.saveFailed); if (ok) onDone(); })}>
            <Trash2 size={14} /> {t.remove}
          </Button>
        )}
        <span className="pa-spacer" />
        <Button type="button" variant="ghost" onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">{t.save}</Button>
      </div>
    </form>
  );
}

/* ──────────────────────────── webhook editor ─────────────────────────────── */

function WebhookEditor({ t, api, draft: initial, url, onDone }: {
  t: Copy; api: AutomationsApi; draft: Webhook; url: string; onDone: () => void;
}): JSX.Element {
  const toast = useToast();
  const [d, setD] = useState<Webhook>(initial);
  const initialPreset = (Object.keys(PRESETS) as PresetId[]).find((k) => PRESETS[k].schema === initial.schema) ?? 'custom';
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [sample, setSample] = useState(PRESETS[initialPreset].sample);
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const isNew = !api.state.webhooks.some((w) => w.id === d.id);

  const persist = async (): Promise<boolean> => api.saveWebhook({ ...d, guards: normalizeGuards(d.guards) });

  const runTest = useCallback(async (): Promise<void> => {
    setTesting(true);
    const ok = await persist();
    if (!ok) { setTesting(false); toast(t.saveFailed); return; }
    const r = await api.testWebhook(d.id, sample);
    setTesting(false);
    const msg = r.status ? t.testResult(r.status) + (r.error ? ` · ${r.error}` : '') : t.testFailed(r.error ?? '');
    setResult(msg);
    toast(msg);
  // persist reads the latest draft through closure; re-bind when it changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, sample, api, toast, t]);

  // `t` sends a test from the editor (not while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 't' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      void runTest();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runTest]);

  return (
    <form className="pa-sheet-body" onSubmit={(e) => { e.preventDefault(); void persist().then((ok) => { toast(ok ? t.saved : t.saveFailed); if (ok) onDone(); }); }}>
      <Label htmlFor="pa-w-name">{t.name}</Label>
      <Input id="pa-w-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />

      <Label>{t.preset}</Label>
      <Select aria-label={t.preset} value={preset}
        options={(Object.keys(PRESETS) as PresetId[]).map((p) => ({ value: p, label: t.presets[p] }))}
        onValueChange={(v) => {
          const p = v as PresetId;
          setPreset(p);
          setD((x) => ({ ...x, schema: PRESETS[p].schema }));
          setSample(PRESETS[p].sample);
        }} />

      <Label htmlFor="pa-w-url">{t.url}</Label>
      <div className="pa-inline">
        <Input id="pa-w-url" readOnly value={url} placeholder={t.noUrl} className="pa-mono" />
        <IconButton type="button" label={t.copy} disabled={!url}
          onClick={() => void navigator.clipboard?.writeText(url).then(() => toast(t.copied))}><CopyIcon size={14} /></IconButton>
      </div>

      <Label htmlFor="pa-w-secret">{t.secret}</Label>
      <div className="pa-inline">
        <Input id="pa-w-secret" readOnly className="pa-mono" type={reveal ? 'text' : 'password'}
          value={d.secret} autoComplete="off" spellCheck={false} />
        <IconButton type="button" label={reveal ? t.hide : t.reveal} aria-pressed={reveal} onClick={() => setReveal((r) => !r)}>
          {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
        </IconButton>
        <IconButton type="button" label={t.regenerate}
          onClick={() => void api.newSecret().then((s) => { setD((x) => ({ ...x, secret: s })); setReveal(false); toast(t.regenerated); })}>
          <RefreshCw size={14} />
        </IconButton>
      </div>

      <Label>{t.schema}</Label>
      <Suspense fallback={<Skeleton style={{ height: 180, width: '100%' }} />}>
        <JsonEditor value={d.schema} onChange={(v) => setD({ ...d, schema: v })} />
      </Suspense>

      <Label htmlFor="pa-w-sample">{t.sample}</Label>
      <textarea id="pa-w-sample" className="pa-textarea pa-mono" rows={5} value={sample} onChange={(e) => setSample(e.target.value)} />
      <div className="pa-inline">
        <Button type="button" variant="secondary" size="sm" disabled={testing} onClick={() => void runTest()}>
          <Zap size={14} /> {t.test} <Kbd>T</Kbd>
        </Button>
        {result && <span className="pa-hint" role="status">{result}</span>}
      </div>

      <GuardsFields t={t} value={d.guards} onChange={(g) => setD({ ...d, guards: g })} />

      <label className="pa-check">
        <input type="checkbox" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} /> {t.enabled}
      </label>

      <div className="pa-sheet-actions">
        {!isNew && (
          <Button type="button" variant="danger" size="sm"
            onClick={() => void api.deleteWebhook(d.id).then((ok) => { toast(ok ? t.removed : t.saveFailed); if (ok) onDone(); })}>
            <Trash2 size={14} /> {t.remove}
          </Button>
        )}
        <span className="pa-spacer" />
        <Button type="button" variant="ghost" onClick={onDone}>{t.cancel}</Button>
        <Button type="submit" variant="primary">{t.save}</Button>
      </div>
    </form>
  );
}

/* ──────────────────────────────── history ────────────────────────────────── */

function History({ t, api }: { t: Copy; api: AutomationsApi }): JSX.Element {
  const rows = api.state.history;
  if (!rows.length) return <EmptyState title={t.historyEmpty.title} description={t.historyEmpty.body} />;
  const typeOf = (e: HistoryEntry): string => (e.source === 'schedule' ? t.types.schedule : e.source === 'webhook' ? t.types.webhook : e.source);
  return (
    <>
      <div className="pa-history-bar">
        <Button variant="ghost" size="sm" onClick={() => void api.clearHistory()}><Trash2 size={14} /> {t.clear}</Button>
      </div>
      <Table className="pa-table">
        <THead>
          <TR><TH>{t.hCols.when}</TH><TH>{t.hCols.source}</TH><TH>{t.hCols.what}</TH><TH>{t.hCols.status}</TH></TR>
        </THead>
        <TBody>
          {rows.map((e) => (
            <TR key={e.id}>
              <TD><span title={fullStamp(new Date(e.at).toISOString())}>{relative(new Date(e.at).toISOString())}</span></TD>
              <TD><span className="pa-name">{e.sourceName}</span> <span className="pa-muted">· {typeOf(e)}{e.direction === 'outbound' ? ' ↑' : ''}</span></TD>
              <TD className="pa-what" title={e.body}>{e.title && e.title !== e.decision ? <strong>{e.title} </strong> : null}{e.body}</TD>
              <TD>
                <span className="pa-last">
                  <Badge tone={badgeTone(e.decision)}>{t.status[e.decision ?? 'sent'] ?? e.decision}</Badge>
                  {e.decision === 'pending' && (
                    <>
                      <Button size="sm" variant="primary" onClick={() => void api.decide(e.id, 'approved')}><Check size={13} /> {t.approve}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void api.decide(e.id, 'rejected')}>{t.deny}</Button>
                    </>
                  )}
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
