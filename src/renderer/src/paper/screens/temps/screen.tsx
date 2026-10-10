/** Temps (MDF-20): live strip, history table, pending spawn-requests. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import {
  Badge, Button, Card, Dialog, DialogContent, EmptyState, Kbd, Sheet, SheetContent,
  Skeleton, Table, TBody, TD, TH, THead, TR, ToastProvider, useToast
} from '@/ui';
import { RichText } from '../../common/RichText';
import { fullStamp } from '../../data/time';
import { hrefFor, type PaperRoute } from '../../routes';
import { COPY } from './copy';
import {
  costLabel, filterHistory, fmtRuntime, fmtTokens, tempsSource,
  type DateFilter, type HistoryTemp, type LiveTemp, type ResultFilter, type TempsSnapshot
} from './model';
import '../../common/common.css';
import './temps.css';

export const route: PaperRoute = 'temps';

const POLL_MS = 1500;

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

function resultTone(r: HistoryTemp['result']): 'success' | 'danger' | 'warning' {
  if (r === 'done') return 'success';
  if (r === 'failed') return 'danger';
  return 'warning';
}

function ScreenInner(): JSX.Element {
  const src = useMemo(() => tempsSource(), []);
  const toast = useToast();
  const [snap, setSnap] = useState<TempsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [date, setDate] = useState<DateFilter>('any');
  const [result, setResult] = useState<ResultFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState<HistoryTemp | null>(null);
  const [stopId, setStopId] = useState<string | null>(null);
  const [stopping, setStopping] = useState<Record<string, boolean>>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await src.snapshot();
      setSnap(next);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [src]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const t = window.setInterval(() => { void refresh(); }, POLL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const history = useMemo(
    () => (snap ? filterHistory(snap.history, date, result, now) : []),
    [snap, date, result, now]
  );
  const live = snap?.live ?? [];
  const pending = snap?.pending ?? [];
  const empty = !loading && !error && live.length === 0 && (snap?.history.length ?? 0) === 0 && pending.length === 0;

  const rows = useMemo(() => {
    const ids = [
      ...live.map((t) => `live:${t.id}`),
      ...history.map((t) => `hist:${t.id}`)
    ];
    return ids;
  }, [live, history]);

  useEffect(() => {
    if (!rows.length) return;
    if (!selectedId || !rows.includes(selectedId)) setSelectedId(rows[0]);
  }, [rows, selectedId]);

  const move = useCallback((delta: number) => {
    if (!rows.length) return;
    const i = Math.max(0, rows.findIndex((id) => id === selectedId));
    const next = rows[Math.min(rows.length - 1, Math.max(0, (selectedId ? i : -1) + delta))];
    setSelectedId(next);
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(next)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [rows, selectedId]);

  const selectedLive = live.find((t) => `live:${t.id}` === selectedId) ?? null;
  const selectedHist = history.find((t) => `hist:${t.id}` === selectedId) ?? null;

  const askStop = useCallback((id: string) => setStopId(id), []);

  const doStop = useCallback(async (id: string) => {
    setStopping((s) => ({ ...s, [id]: true }));
    setStopId(null);
    try {
      const r = await src.stop(id);
      if (!r.ok) toast(r.error ?? 'Could not stop');
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Stop failed');
    } finally {
      setStopping((s) => ({ ...s, [id]: false }));
    }
  }, [src, refresh, toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (open || stopId) {
        if (e.key === 'Escape') { setOpen(null); setStopId(null); }
        return;
      }
      if (e.key === 'j') { e.preventDefault(); move(1); }
      else if (e.key === 'k') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && selectedHist) { e.preventDefault(); setOpen(selectedHist); }
      else if (e.key === 'Enter' && selectedLive) {
        e.preventDefault();
        window.location.hash = hrefFor('agent', selectedLive.id);
      } else if (e.key === 'x' && selectedLive && !selectedLive.releasing) {
        e.preventDefault();
        askStop(selectedLive.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, open, stopId, selectedHist, selectedLive, askStop]);

  function LiveCard({ t }: { t: LiveTemp }): JSX.Element {
    const row = `live:${t.id}`;
    const busy = t.releasing || !!stopping[t.id];
    return (
      <Card
        className="pw-card"
        data-row={row}
        aria-current={selectedId === row}
        onClick={() => setSelectedId(row)}
      >
        <div className="pw-card-meta">
          <Badge tone={busy ? 'warning' : 'success'}>{busy ? COPY.stopping : t.name}</Badge>
          <span>{fmtRuntime(now - t.spawnedAt)}</span>
          <span>{costLabel(t.tokens, t.usd)}</span>
        </div>
        <p className="pw-card-obj">{t.objective || t.name}</p>
        <div className="pw-card-actions">
          <Button size="sm" variant="danger" disabled={busy} onClick={() => askStop(t.id)}>
            {busy ? COPY.stopping : COPY.stop}
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href={hrefFor('agent', t.id)}>{COPY.openRoom}</a>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="pc-screen pw-root">
      <header className="pw-toolbar">
        <div className="pw-toolbar-top">
          <div>
            <h1>{COPY.title}</h1>
            <p className="pw-lede">
              <span className="pc-mode" data-mode={src.mode}>
                <span className="pc-dot" />
                {src.mode === 'live' ? COPY.live : COPY.demo}
              </span>
              <span>{COPY.lede}</span>
              {snap ? <span>{live.length} / {snap.maxWorkers} live</span> : null}
            </p>
          </div>
        </div>
        <div className="pw-filters">
          <select
            className="paper-input pw-select"
            aria-label={COPY.started}
            value={date}
            onChange={(e) => setDate(e.target.value as DateFilter)}
          >
            <option value="any">{COPY.dateAny}</option>
            <option value="today">{COPY.dateToday}</option>
            <option value="7d">{COPY.date7}</option>
            <option value="30d">{COPY.date30}</option>
          </select>
          <select
            className="paper-input pw-select"
            aria-label={COPY.result}
            value={result}
            onChange={(e) => setResult(e.target.value as ResultFilter)}
          >
            <option value="all">{COPY.resultAll}</option>
            <option value="done">{COPY.resultDone}</option>
            <option value="failed">{COPY.resultFailed}</option>
            <option value="stopped">{COPY.resultStopped}</option>
          </select>
        </div>
      </header>

      <div className="pw-body" ref={bodyRef}>
        {error ? (
          <EmptyState
            icon={<Timer size={28} />}
            title={COPY.error.title}
            description={error}
            action={<Button onClick={() => { setLoading(true); void refresh(); }}>{COPY.error.retry}</Button>}
          />
        ) : loading ? (
          <div className="pw-skel" aria-busy="true" aria-label={COPY.loading}>
            <Skeleton className="pw-skel-card" />
            <Skeleton className="pw-skel-row" />
            <Skeleton className="pw-skel-row" />
            <Skeleton className="pw-skel-row" />
          </div>
        ) : empty ? (
          <EmptyState icon={<Timer size={28} />} title={COPY.empty.title} description={COPY.empty.body} />
        ) : (
          <>
            <section className="pw-section" aria-label={COPY.liveStrip}>
              <div className="pw-section-head">
                <h2>{COPY.liveStrip}</h2>
                <span className="pc-key">{live.length}</span>
              </div>
              {live.length === 0 ? (
                <p className="pw-hint">{COPY.empty.body}</p>
              ) : (
                <div className="pw-strip">
                  {live.map((t) => <LiveCard key={t.id} t={t} />)}
                </div>
              )}
            </section>

            {pending.length > 0 ? (
              <section className="pw-section" aria-label={COPY.pending}>
                <div className="pw-section-head">
                  <h2>{COPY.pending}</h2>
                  <span className="pc-key">{pending.length}</span>
                </div>
                <p className="pw-hint">
                  {snap?.spawnEnabled ? COPY.pendingHintOn : COPY.pendingHintOff}
                  {' '}
                  <a href="#/">{COPY.autonomyLink}</a>
                </p>
                <div className="pw-pending">
                  {pending.map((p) => (
                    <div key={p.id} className="pw-pending-row">
                      <strong>{p.name}</strong>
                      <p className="pw-pending-obj">{p.objective || p.file}</p>
                      <span className="pc-key">waiting {fmtRuntime(p.waitingMs)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="pw-section" aria-label={COPY.history}>
              <div className="pw-section-head">
                <h2>{COPY.history}</h2>
                <span className="pc-key">{history.length}</span>
              </div>
              {history.length === 0 ? (
                <EmptyState
                  title={(snap?.history.length ?? 0) === 0 ? COPY.emptyHistory.title : COPY.emptyFiltered.title}
                  description={(snap?.history.length ?? 0) === 0 ? COPY.emptyHistory.body : COPY.emptyFiltered.body}
                />
              ) : (
                <div className="pw-table-wrap">
                  <Table className="pw-table">
                    <THead>
                      <TR>
                        <TH>{COPY.objective}</TH>
                        <TH>{COPY.started}</TH>
                        <TH>{COPY.runtime}</TH>
                        <TH>{COPY.cost}</TH>
                        <TH>{COPY.result}</TH>
                        <TH>{COPY.slack}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {history.map((t) => {
                        const row = `hist:${t.id}`;
                        return (
                          <TR
                            key={t.id}
                            data-row={row}
                            aria-current={selectedId === row}
                            onClick={() => { setSelectedId(row); setOpen(t); }}
                          >
                            <TD>{t.objective || t.name}</TD>
                            <TD>{fullStamp(new Date(t.startedAt).toISOString())}</TD>
                            <TD>{fmtRuntime(Math.max(0, t.endedAt - t.startedAt))}</TD>
                            <TD>{costLabel(t.tokens, t.usd)}</TD>
                            <TD><Badge tone={resultTone(t.result)}>{t.result}</Badge></TD>
                            <TD>
                              {t.slackUrl ? (
                                <a href={t.slackUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                  thread
                                </a>
                              ) : '—'}
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <footer className="pw-foot">
        <span>{fmtTokens(live.reduce((n, t) => n + t.tokens, 0))} live tokens</span>
        <div className="pw-foot-keys">
          <Kbd>j</Kbd><Kbd>k</Kbd> {COPY.keys.move}
          <Kbd>↵</Kbd> {COPY.keys.open}
          <Kbd>x</Kbd> {COPY.keys.stop}
        </div>
      </footer>

      <Sheet open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        {open ? (
          <SheetContent title={open.name} description={open.result}>
            <div className="pw-sheet-body">
              <div className="pw-sheet-meta">
                <Badge tone={resultTone(open.result)}>{open.result}</Badge>
                <span>{fullStamp(new Date(open.startedAt).toISOString())}</span>
                <span>{fmtRuntime(Math.max(0, open.endedAt - open.startedAt))}</span>
                <span>{costLabel(open.tokens, open.usd)}</span>
              </div>
              <div className="pw-sheet-block">
                <h3>{COPY.objective}</h3>
                <p>{open.objective}</p>
              </div>
              {open.report ? (
                <div className="pw-sheet-block">
                  <h3>{COPY.report}</h3>
                  <div className="pc-rich"><RichText text={open.report} /></div>
                </div>
              ) : null}
              {open.failureReason ? (
                <div className="pw-sheet-block">
                  <h3>{COPY.failure}</h3>
                  <p>{open.failureReason}</p>
                </div>
              ) : null}
              {open.slackUrl ? (
                <Button variant="secondary" asChild>
                  <a href={open.slackUrl} target="_blank" rel="noreferrer">{COPY.slack}</a>
                </Button>
              ) : null}
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      <Dialog open={!!stopId} onOpenChange={(v) => { if (!v) setStopId(null); }}>
        {stopId ? (
          <DialogContent title={COPY.confirmStopTitle} description={COPY.confirmStopBody}>
            <div className="pw-dialog-actions">
              <Button variant="secondary" onClick={() => setStopId(null)}>{COPY.cancel}</Button>
              <Button variant="danger" onClick={() => void doStop(stopId)}>{COPY.confirm}</Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

export function Screen(): JSX.Element {
  return (
    <ToastProvider>
      <ScreenInner />
    </ToastProvider>
  );
}
