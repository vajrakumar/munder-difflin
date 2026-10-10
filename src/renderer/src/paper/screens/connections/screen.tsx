/** Connections (MDF-20): list, add, test REST integrations with masked secrets. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Puzzle } from 'lucide-react';
import {
  Badge, Button, EmptyState, Input, Kbd, Label, Select, Sheet, SheetContent,
  Skeleton, Table, TBody, TD, TH, THead, TR, ToastProvider, useToast
} from '@/ui';
import type { PaperRoute } from '../../routes';
import { COPY } from './copy';
import {
  INTEGRATION_TEMPLATES, authTypeNeedsSecret, connectionsSource, draftFromTemplate, slugify, statusOf,
  type ConnStatus, type IntegrationAuthType, type IntegrationRecordView, type TestResult
} from './model';
import '../../common/common.css';
import './connections.css';

export const route: PaperRoute = 'connections';

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

const AUTH_OPTIONS: Array<{ value: IntegrationAuthType; label: string }> = [
  { value: 'none', label: COPY.authNone },
  { value: 'bearer', label: COPY.authBearer },
  { value: 'header', label: COPY.authCustomHeader },
  { value: 'github', label: COPY.authGithub }
];

function tone(s: ConnStatus): 'success' | 'danger' | 'neutral' {
  if (s === 'ok') return 'success';
  if (s === 'failing') return 'danger';
  return 'neutral';
}

function statusLabel(s: ConnStatus): string {
  if (s === 'ok') return COPY.ok;
  if (s === 'failing') return COPY.failing;
  return COPY.untested;
}

interface Draft {
  template: string;
  id: string;
  label: string;
  baseUrl: string;
  authType: IntegrationAuthType;
  authHeader: string;
  secret: string;
  enabled: boolean;
}

function emptyDraft(): Draft {
  const t = INTEGRATION_TEMPLATES[0];
  const d = draftFromTemplate(t);
  return {
    template: t.idSuggestion,
    id: d.id,
    label: d.label,
    baseUrl: d.baseUrl,
    authType: d.authType,
    authHeader: d.authHeader ?? '',
    secret: '',
    enabled: true
  };
}

function ScreenInner(): JSX.Element {
  const src = useMemo(() => connectionsSource(), []);
  const toast = useToast();
  const [rows, setRows] = useState<IntegrationRecordView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [lastTest, setLastTest] = useState<Record<string, TestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await src.list();
      setRows(list);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [src]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!rows.length) return;
    if (!selectedId || !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const onTest = useCallback(async (id: string) => {
    setTestingId(id);
    try {
      const r = await src.test(id);
      setLastTest((m) => ({ ...m, [id]: r }));
      toast(r.ok ? COPY.testOk(r.status ?? 0, r.ms ?? 0) : COPY.testFail(r.status, r.ms, r.error));
    } catch (err) {
      const fail: TestResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
      setLastTest((m) => ({ ...m, [id]: fail }));
      toast(fail.error ?? 'Test failed');
    } finally {
      setTestingId(null);
    }
  }, [src, toast]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const now = Date.now();
      const rec = {
        id: slugify(draft.id || draft.label),
        label: draft.label.trim(),
        kind: (INTEGRATION_TEMPLATES.find((t) => t.idSuggestion === draft.template)?.kind ?? 'custom-rest') as IntegrationRecordView['kind'],
        baseUrl: draft.baseUrl.trim(),
        authType: draft.authType,
        authHeader: draft.authType === 'header' ? draft.authHeader.trim() : undefined,
        enabled: draft.enabled,
        createdAt: now,
        updatedAt: now
      };
      const secret = draft.secret.trim() || undefined;
      const r = await src.save(rec, secret);
      if (!r.ok) { toast(r.error ?? 'Could not save'); return; }
      setAdding(false);
      setDraft(emptyDraft());
      await refresh();
      setSelectedId(rec.id);
      toast(COPY.save);
    } finally {
      setSaving(false);
    }
  }, [draft, src, refresh, toast]);

  const onRemove = useCallback(async (id: string) => {
    await src.remove(id);
    setLastTest((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    await refresh();
  }, [src, refresh]);

  function applyTemplate(idSuggestion: string): void {
    const t = INTEGRATION_TEMPLATES.find((x) => x.idSuggestion === idSuggestion) ?? INTEGRATION_TEMPLATES[0];
    const d = draftFromTemplate(t);
    setDraft({
      template: t.idSuggestion,
      id: d.id,
      label: d.label,
      baseUrl: d.baseUrl,
      authType: d.authType,
      authHeader: d.authHeader ?? '',
      secret: '',
      enabled: true
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' && !isTyping(e.target) && !adding) {
        e.preventDefault();
        setDraft(emptyDraft());
        setAdding(true);
        return;
      }
      if (isTyping(e.target) || adding) return;
      if (e.key === 't' && selected) { e.preventDefault(); void onTest(selected.id); }
      if (!rows.length) return;
      const i = Math.max(0, rows.findIndex((r) => r.id === selectedId));
      if (e.key === 'j') {
        const next = rows[Math.min(rows.length - 1, (selectedId ? i : -1) + 1)];
        setSelectedId(next.id);
      } else if (e.key === 'k') {
        const next = rows[Math.max(0, (selectedId ? i : 0) - 1)];
        setSelectedId(next.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adding, onTest, rows, selected, selectedId]);

  return (
    <div className="pc-screen pn-root">
      <header className="pn-toolbar">
        <div>
          <h1>{COPY.title}</h1>
          <p className="pn-lede">
            <span className="pc-mode" data-mode={src.mode}>
              <span className="pc-dot" />
              {src.mode === 'live' ? COPY.live : COPY.demo}
            </span>
            <span>{COPY.lede}</span>
          </p>
        </div>
        <Button onClick={() => { setDraft(emptyDraft()); setAdding(true); }}>{COPY.add}</Button>
      </header>

      <div className="pn-body">
        {error ? (
          <EmptyState
            icon={<Puzzle size={28} />}
            title={COPY.error.title}
            description={error}
            action={<Button onClick={() => { setLoading(true); void refresh(); }}>{COPY.error.retry}</Button>}
          />
        ) : loading ? (
          <div className="pn-skel" aria-busy="true" aria-label={COPY.loading}>
            <Skeleton className="pn-skel-row" />
            <Skeleton className="pn-skel-row" />
            <Skeleton className="pn-skel-row" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Puzzle size={28} />}
            title={COPY.empty.title}
            description={COPY.empty.body}
            action={<Button onClick={() => setAdding(true)}>{COPY.add}</Button>}
          />
        ) : (
          <Table className="pn-table">
            <THead>
              <TR>
                <TH>{COPY.name}</TH>
                <TH>{COPY.status}</TH>
                <TH>{COPY.baseUrl}</TH>
                <TH>{COPY.auth}</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const st = statusOf(lastTest[r.id]);
                const test = lastTest[r.id];
                return (
                  <TR
                    key={r.id}
                    aria-current={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <TD>{r.label}</TD>
                    <TD>
                      <Badge tone={tone(st)}>{statusLabel(st)}</Badge>
                      {test ? (
                        <div className="pn-test">
                          {test.ok
                            ? COPY.testOk(test.status ?? 0, test.ms ?? 0)
                            : COPY.testFail(test.status, test.ms, test.error)}
                        </div>
                      ) : null}
                    </TD>
                    <TD><span className="pn-url">{r.baseUrl}</span></TD>
                    <TD>{r.authType}{r.hasSecret ? ' · ••••' : ''}</TD>
                    <TD>
                      <div className="pn-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={testingId === r.id}
                          onClick={(e) => { e.stopPropagation(); void onTest(r.id); }}
                        >
                          {testingId === r.id ? COPY.testing : COPY.test}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); void onRemove(r.id); }}
                        >
                          {COPY.remove}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      <footer className="pn-foot">
        <span>{rows.length} connection{rows.length === 1 ? '' : 's'}</span>
        <div className="pn-foot-keys">
          <Kbd>n</Kbd> {COPY.keys.add}
          <Kbd>t</Kbd> {COPY.keys.test}
          <Kbd>j</Kbd><Kbd>k</Kbd> {COPY.keys.move}
        </div>
      </footer>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent title={COPY.addTitle}>
          <form
            className="pn-form"
            onSubmit={(e) => { e.preventDefault(); void onSave(); }}
          >
            <div className="pn-field">
              <Label>{COPY.template}</Label>
              <Select
                aria-label={COPY.template}
                value={draft.template}
                onValueChange={applyTemplate}
                options={INTEGRATION_TEMPLATES.map((t) => ({ value: t.idSuggestion, label: t.label }))}
              />
            </div>
            <div className="pn-field">
              <Label htmlFor="pn-label">{COPY.label}</Label>
              <Input
                id="pn-label"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value, id: slugify(e.target.value) }))}
                required
              />
            </div>
            <div className="pn-field">
              <Label htmlFor="pn-url">{COPY.baseUrl}</Label>
              <Input
                id="pn-url"
                value={draft.baseUrl}
                onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                placeholder="https://"
                required
              />
            </div>
            <div className="pn-field">
              <Label>{COPY.authType}</Label>
              <Select
                aria-label={COPY.authType}
                value={draft.authType}
                onValueChange={(v) => setDraft((d) => ({ ...d, authType: v as IntegrationAuthType }))}
                options={AUTH_OPTIONS}
              />
            </div>
            {draft.authType === 'header' ? (
              <div className="pn-field">
                <Label htmlFor="pn-hdr">{COPY.headerName}</Label>
                <Input
                  id="pn-hdr"
                  value={draft.authHeader}
                  onChange={(e) => setDraft((d) => ({ ...d, authHeader: e.target.value }))}
                  required
                />
              </div>
            ) : null}
            {authTypeNeedsSecret(draft.authType) ? (
              <div className="pn-field">
                <Label htmlFor="pn-secret">{COPY.secret}</Label>
                <Input
                  id="pn-secret"
                  type="password"
                  autoComplete="new-password"
                  value={draft.secret}
                  onChange={(e) => setDraft((d) => ({ ...d, secret: e.target.value }))}
                  placeholder={COPY.secretPlaceholder}
                />
                <p className="pn-help">{COPY.secretSaved}</p>
              </div>
            ) : null}
            <label className="pn-check">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              />
              {COPY.enabled}
            </label>
            <div className="pn-form-actions">
              <Button type="button" variant="secondary" onClick={() => setAdding(false)}>{COPY.cancel}</Button>
              <Button type="submit" disabled={saving}>{COPY.save}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
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
