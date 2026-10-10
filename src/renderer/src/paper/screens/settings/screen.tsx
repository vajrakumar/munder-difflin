/** Settings (MDF-21): full-screen, searchable, one Save bar. */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search, Settings as Gear } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Badge, Button, Dialog, DialogContent, Input, Kbd, Label, Select, Skeleton,
  ToastProvider, useToast
} from '@/ui';
import { setLanguage } from '@/i18n';
import { searchSettings, SETTINGS_SECTIONS, SETTING_FIELDS, type SettingsSectionId } from '@shared/settingsCatalog';
import { ACCENT_HUES, applyAppearance, type PaperAccent, type PaperDensity } from '../../appearancePref';
import { parseHash, hrefFor, type PaperRoute } from '../../routes';
import { applyPref, resolvedTheme, type PaperThemePref } from '../../themePref';
import {
  DEMO_DRAFT, diffDraft, loadSettings, persistSettings, type DraftKey, type SettingsDraft
} from './model';
import '../../common/common.css';
import './settings.css';

export const route: PaperRoute = 'settings';

const ACCENT_OPTS: PaperAccent[] = ['indigo', 'coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'];

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

/** `#/settings/connections` is the MDF-20 Connections screen. */
function slugForSection(id: SettingsSectionId): string {
  return id === 'connections' ? 'connect' : id;
}

function sectionFromHash(): SettingsSectionId {
  const s = parseHash(window.location.hash).settingsSection;
  if (s === 'connect') return 'connections';
  if (s && SETTINGS_SECTIONS.some((x) => x.id === s)) return s as SettingsSectionId;
  return 'appearance';
}

function Field({
  id, label, help, error, children
}: {
  id: string;
  label: string;
  help: string;
  error?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="ps-field" data-setting-id={id} id={`setting-${id}`}>
      <div className="ps-field-head">
        <Label htmlFor={id} className="ps-label">{label}</Label>
        {children}
      </div>
      <p className="ps-help">{help}</p>
      {error ? <p className="ps-err" role="alert">{error}</p> : null}
    </div>
  );
}

function Toggle({
  id, checked, onChange, label
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}): JSX.Element {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="paper-btn paper-btn-secondary paper-btn-sm"
      onClick={() => onChange(!checked)}
    >
      {checked ? 'On' : 'Off'}
    </button>
  );
}

function ScreenInner(): JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SettingsSectionId>(sectionFromHash);
  const [query, setQuery] = useState('');
  const [hit, setHit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SettingsDraft>(DEMO_DRAFT);
  const [draft, setDraft] = useState<SettingsDraft>(DEMO_DRAFT);
  const [review, setReview] = useState(false);
  const [leave, setLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErr, setFieldErr] = useState<Partial<Record<DraftKey, string>>>({});
  const [highlight, setHighlight] = useState<string | null>(null);

  const patch = useCallback(<K extends DraftKey>(key: K, value: SettingsDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  useEffect(() => {
    let alive = true;
    loadSettings().then((d) => {
      if (!alive) return;
      setSaved(d);
      setDraft(d);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onHash = (): void => setSection(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const changes = useMemo(() => diffDraft(saved, draft), [saved, draft]);
  const dirty = changes.length > 0;

  useEffect(() => {
    applyPref(draft.theme);
    applyAppearance({
      density: draft.density,
      accent: draft.accent,
      officeView: draft.officeView,
      theme: resolvedTheme(draft.theme)
    });
  }, [draft.density, draft.accent, draft.officeView, draft.theme]);

  const extraHay = useCallback((id: string) => {
    const f = SETTING_FIELDS.find((x) => x.id === id);
    if (!f) return '';
    return `${t(f.i18nLabel)} ${t(f.i18nHelp)}`;
  }, [t]);

  const hits = useMemo(() => searchSettings(query, extraHay), [query, extraHay]);

  function goSection(id: SettingsSectionId): void {
    setSection(id);
    window.location.hash = hrefFor('settings', slugForSection(id));
  }

  function jumpTo(id: string): void {
    const f = SETTING_FIELDS.find((x) => x.id === id);
    if (!f) return;
    setQuery('');
    goSection(f.section);
    setHighlight(id);
    window.setTimeout(() => {
      const el = document.getElementById(`setting-${id}`);
      el?.scrollIntoView({ block: 'center' });
    }, 40);
    window.setTimeout(() => setHighlight(null), 2400);
  }

  const discard = useCallback((): void => {
    setDraft(saved);
    setFieldErr({});
    applyPref(saved.theme);
    applyAppearance({
      density: saved.density,
      accent: saved.accent,
      officeView: saved.officeView,
      theme: resolvedTheme(saved.theme)
    });
  }, [saved]);

  const save = useCallback(async (): Promise<void> => {
    setBusy(true);
    setFieldErr({});
    try {
      if (draft.costCapTokens.trim() && !Number.isFinite(Number(draft.costCapTokens))) {
        setFieldErr({ costCapTokens: t('settings.fieldError') });
        toast(t('settings.saveFailed'));
        goSection('autonomy');
        return;
      }
      await persistSettings(draft, saved);
      setLanguage(draft.language);
      setSaved(draft);
      setReview(false);
      toast(t('settings.saved'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFieldErr({ costCapTokens: msg });
      toast(msg || t('settings.saveFailed'));
    } finally {
      setBusy(false);
    }
  }, [draft, saved, t, toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) void save();
        return;
      }
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (query) { setQuery(''); return; }
        if (review) { setReview(false); return; }
        if (dirty) { setLeave(true); return; }
      }
      if (query && hits.length) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHit((i) => Math.min(hits.length - 1, i + 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setHit((i) => Math.max(0, i - 1)); }
        if (e.key === 'Enter') { e.preventDefault(); jumpTo(hits[hit]?.id ?? hits[0].id); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, query, hits, hit, review, save]);

  useEffect(() => { setHit(0); }, [query]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent): void => {
      const a = (e.target as HTMLElement).closest('a');
      const href = a?.getAttribute('href') ?? '';
      if (!href.startsWith('#') || href.startsWith('#/settings')) return;
      e.preventDefault();
      setLeave(true);
      pendingHref.current = href;
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const pendingHref = useRef<string | null>(null);

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent): void => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  const lbl = (id: string, fallback: string): string => {
    const f = SETTING_FIELDS.find((x) => x.id === id);
    return f ? t(f.i18nLabel, { defaultValue: fallback }) : fallback;
  };
  const hlp = (id: string, fallback: string): string => {
    const f = SETTING_FIELDS.find((x) => x.id === id);
    return f ? t(f.i18nHelp, { defaultValue: fallback }) : fallback;
  };

  return (
    <div className="pc-screen ps-root" data-mode="demo">
      <div className="ps-layout">
        <header className="ps-head">
          <Gear size={18} aria-hidden />
          <h1>{t('settings.title', { defaultValue: 'Settings' })}</h1>
          <div className="ps-search">
            <Search size={14} />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('settings.searchPlaceholder', { defaultValue: 'Search settings' })}
              aria-label={t('settings.searchPlaceholder', { defaultValue: 'Search settings' })}
              autoComplete="off"
            />
            <Kbd style={{ position: 'absolute', insetInlineEnd: 8 }}>/</Kbd>
            {query.trim() ? (
              <div className="ps-search-hits" role="listbox" aria-label="Search results">
                {hits.length === 0 ? (
                  <div className="ps-hit">{t('settings.searchNoResults', { defaultValue: 'No matching settings' })}</div>
                ) : hits.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    className="ps-hit"
                    data-active={i === hit ? 'true' : undefined}
                    onMouseEnter={() => setHit(i)}
                    onClick={() => jumpTo(h.id)}
                  >
                    <span className="ps-hit-label">{t(h.i18nLabel, { defaultValue: h.label })}</span>
                    <span className="ps-hit-help">{t(h.i18nHelp, { defaultValue: h.help })}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>
        <nav className="ps-nav" aria-label={t('settings.title', { defaultValue: 'Settings' })}>
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="ps-nav-btn"
              aria-current={section === s.id ? 'page' : undefined}
              onClick={() => goSection(s.id)}
            >
              {t(s.navKey, { defaultValue: s.label })}
            </button>
          ))}
        </nav>
        <div className="ps-body" ref={bodyRef}>
          {loading ? (
            <div className="ps-skel" aria-busy="true" aria-label="Loading">
              <Skeleton /><Skeleton /><Skeleton /><Skeleton />
            </div>
          ) : (
            <div className="ps-section">
              <h2>{t(SETTINGS_SECTIONS.find((s) => s.id === section)?.navKey ?? '', { defaultValue: section })}</h2>
              {section === 'appearance' && (
                <>
                  <p className="ps-lede">{t('settings.appearance.lede', { defaultValue: 'Theme, density, accent and the optional office floor.' })}</p>
                  <Field id="theme" label={lbl('theme', 'Theme')} help={hlp('theme', '')} >
                    <Select
                      aria-label={lbl('theme', 'Theme')}
                      value={draft.theme}
                      onValueChange={(v) => patch('theme', v as PaperThemePref)}
                      options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'hc', label: 'High contrast' }
                      ]}
                    />
                  </Field>
                  <Field id="density" label={lbl('density', 'Density')} help={hlp('density', '')}>
                    <Select
                      aria-label={lbl('density', 'Density')}
                      value={draft.density}
                      onValueChange={(v) => patch('density', v as PaperDensity)}
                      options={[
                        { value: 'compact', label: t('settings.appearance.compact', { defaultValue: 'Compact' }) },
                        { value: 'comfortable', label: t('settings.appearance.comfortable', { defaultValue: 'Comfortable' }) },
                        { value: 'roomy', label: t('settings.appearance.roomy', { defaultValue: 'Roomy' }) }
                      ]}
                    />
                  </Field>
                  <Field id="accent" label={lbl('accent', 'Accent colour')} help={hlp('accent', '')}>
                    <div className="ps-row" role="radiogroup" aria-label={lbl('accent', 'Accent colour')}>
                      {ACCENT_OPTS.map((a) => (
                        <Button
                          key={a}
                          size="sm"
                          variant={draft.accent === a ? 'primary' : 'secondary'}
                          aria-pressed={draft.accent === a}
                          onClick={() => patch('accent', a)}
                        >
                          <span className="ps-swatch" style={{ background: `oklch(55% 0.14 ${ACCENT_HUES[a]})` }} />
                          {a}
                        </Button>
                      ))}
                    </div>
                  </Field>
                  <Field id="officeView" label={lbl('officeView', 'Office view')} help={hlp('officeView', '')}>
                    <Toggle id="officeView" label={lbl('officeView', 'Office view')} checked={draft.officeView} onChange={(v) => patch('officeView', v)} />
                  </Field>
                </>
              )}
              {section === 'general' && (
                <>
                  <Field id="homeFolder" label={lbl('homeFolder', 'Home folder')} help={hlp('homeFolder', t('settings.general.homeFolderHelp', { defaultValue: 'Pinned fork home. Changing it restarts the app.' }))}>
                    <Input id="homeFolder" value={draft.homeFolder} onChange={(e) => patch('homeFolder', e.target.value)} />
                  </Field>
                  <Field id="language" label={lbl('language', 'Language')} help={hlp('language', '')}>
                    <Select
                      aria-label={lbl('language', 'Language')}
                      value={draft.language}
                      onValueChange={(v) => patch('language', v)}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'zh-CN', label: '简体中文' },
                        { value: 'ar', label: 'العربية' }
                      ]}
                    />
                  </Field>
                  {(['keepAwake', 'simpleMode', 'notifications', 'autoCompact', 'autoUpdate', 'telemetry'] as const).map((k) => (
                    <Field key={k} id={k} label={lbl(k, k)} help={hlp(k, '')}>
                      <Toggle id={k} label={lbl(k, k)} checked={draft[k]} onChange={(v) => patch(k, v)} />
                    </Field>
                  ))}
                </>
              )}
              {section === 'prerequisites' && (
                <>
                  <p className="ps-lede">{t('settings.prereq.lede', { defaultValue: 'Tools the office needs. Missing ones get an install card.' })}</p>
                  {[
                    { id: 'prereqGit', ok: true },
                    { id: 'prereqNode', ok: true },
                    { id: 'prereqClaude', ok: true }
                  ].map((row) => (
                    <div key={row.id} className="ps-field" data-setting-id={row.id} id={`setting-${row.id}`}>
                      <div className="ps-prereq">
                        <div>
                          <div className="ps-label">{lbl(row.id, row.id)}</div>
                          <p className="ps-help">{hlp(row.id, '')}</p>
                        </div>
                        <Badge tone={row.ok ? 'success' : 'warning'}>{row.ok ? 'Installed' : 'Missing'}</Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {section === 'agents' && (
                <>
                  <Field id="defaultModel" label={lbl('defaultModel', 'Default agent model')} help={hlp('defaultModel', '')}>
                    <Select
                      aria-label={lbl('defaultModel', 'Default agent model')}
                      value={draft.defaultModel}
                      onValueChange={(v) => patch('defaultModel', v)}
                      options={[
                        { value: 'claude-fable-5', label: 'claude-fable-5' },
                        { value: 'claude-opus-4-8', label: 'claude-opus-4-8' },
                        { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6' }
                      ]}
                    />
                  </Field>
                  <Field id="maxTurns" label={lbl('maxTurns', 'Max turns per run')} help={hlp('maxTurns', '')}>
                    <Input id="maxTurns" inputMode="numeric" placeholder="unlimited" value={draft.maxTurns} onChange={(e) => patch('maxTurns', e.target.value)} />
                  </Field>
                  <Field id="orchSpawn" label={lbl('orchSpawn', 'Orchestrator may spawn temps')} help={hlp('orchSpawn', '')}>
                    <Toggle id="orchSpawn" label={lbl('orchSpawn', 'Orchestrator may spawn temps')} checked={draft.orchSpawn} onChange={(v) => patch('orchSpawn', v)} />
                  </Field>
                </>
              )}
              {section === 'autonomy' && (
                <>
                  <Field id="autoMode" label={lbl('autoMode', 'Autonomy')} help={hlp('autoMode', '')}>
                    <Toggle id="autoMode" label={lbl('autoMode', 'Autonomy')} checked={draft.autoMode} onChange={(v) => patch('autoMode', v)} />
                  </Field>
                  <Field id="costCapTokens" label={lbl('costCapTokens', 'Floor token budget')} help={hlp('costCapTokens', '')} error={fieldErr.costCapTokens}>
                    <Input id="costCapTokens" inputMode="numeric" placeholder="e.g. 1000000" value={draft.costCapTokens} onChange={(e) => patch('costCapTokens', e.target.value)} />
                  </Field>
                  <Field id="agentTokenCap" label={lbl('agentTokenCap', 'Per-agent token cap')} help={hlp('agentTokenCap', '')}>
                    <Input id="agentTokenCap" inputMode="numeric" placeholder="inherit floor" value={draft.agentTokenCap} onChange={(e) => patch('agentTokenCap', e.target.value)} />
                  </Field>
                  <Field id="velocity" label={lbl('velocity', 'Token velocity')} help={hlp('velocity', '')}>
                    <Input id="velocity" inputMode="numeric" placeholder="e.g. 200000" value={draft.velocity} onChange={(e) => patch('velocity', e.target.value)} />
                  </Field>
                  <Field id="brkEnabled" label={lbl('brkEnabled', 'Circuit breaker')} help={hlp('brkEnabled', '')}>
                    <Toggle id="brkEnabled" label={lbl('brkEnabled', 'Circuit breaker')} checked={draft.brkEnabled} onChange={(v) => patch('brkEnabled', v)} />
                  </Field>
                  <Field id="brkHardStop" label={lbl('brkHardStop', 'Hard stop')} help={hlp('brkHardStop', '')}>
                    <Toggle id="brkHardStop" label={lbl('brkHardStop', 'Hard stop')} checked={draft.brkHardStop} onChange={(v) => patch('brkHardStop', v)} />
                  </Field>
                  <Field id="repeated" label={lbl('repeated', 'Repeated-tool limit')} help={hlp('repeated', '')}>
                    <Input id="repeated" inputMode="numeric" value={draft.repeated} onChange={(e) => patch('repeated', e.target.value)} />
                  </Field>
                  <Field id="errorStorm" label={lbl('errorStorm', 'Error-storm limit')} help={hlp('errorStorm', '')}>
                    <Input id="errorStorm" inputMode="numeric" value={draft.errorStorm} onChange={(e) => patch('errorStorm', e.target.value)} />
                  </Field>
                </>
              )}
              {section === 'connections' && (
                <>
                  <p className="ps-lede">{t('settings.connections.lede', { defaultValue: 'Slack, webhooks and REST integrations. Secrets never come back to the renderer.' })}</p>
                  <Field id="slack" label={lbl('slack', 'Slack')} help={hlp('slack', '')}>
                    <Toggle id="slack" label={lbl('slack', 'Slack')} checked={draft.slackOn} onChange={(v) => patch('slackOn', v)} />
                  </Field>
                  {draft.slackOn ? (
                    <Field id="slackChannel" label="Channel id" help="Optional. Blank accepts any channel.">
                      <Input id="slackChannel" value={draft.slackChannel} onChange={(e) => patch('slackChannel', e.target.value)} placeholder="C0123…" />
                    </Field>
                  ) : null}
                  <Field id="webhooks" label={lbl('webhooks', 'Webhook triggers')} help={hlp('webhooks', '')}>
                    <Toggle id="webhooks" label={lbl('webhooks', 'Webhook triggers')} checked={draft.webhooksOn} onChange={(v) => patch('webhooksOn', v)} />
                  </Field>
                  <div className="ps-field" data-setting-id="integrations" id="setting-integrations">
                    <div className="ps-label">{lbl('integrations', 'REST integrations')}</div>
                    <p className="ps-help">{hlp('integrations', '')}</p>
                    <p className="ps-lede"><a href="#/settings/connections">{t('settings.connections.openTemps', { defaultValue: 'Open REST integrations' })}</a></p>
                  </div>
                </>
              )}
              {section === 'voice' && (
                <>
                  <Field id="freeflow" label={lbl('freeflow', 'Free Flow')} help={hlp('freeflow', '')}>
                    <Toggle id="freeflow" label={lbl('freeflow', 'Free Flow')} checked={draft.freeflow} onChange={(v) => patch('freeflow', v)} />
                  </Field>
                  <Field id="idleDisconnect" label={lbl('idleDisconnect', 'Idle auto-disconnect')} help={hlp('idleDisconnect', '')}>
                    <Select
                      aria-label={lbl('idleDisconnect', 'Idle auto-disconnect')}
                      value={draft.idleDisconnect}
                      onValueChange={(v) => patch('idleDisconnect', v)}
                      options={[
                        { value: '30000', label: t('settings.voice.30s') },
                        { value: '60000', label: t('settings.voice.1m') },
                        { value: '180000', label: t('settings.voice.3m') },
                        { value: '300000', label: t('settings.voice.5m') },
                        { value: '0', label: t('settings.voice.never') }
                      ]}
                    />
                  </Field>
                </>
              )}
              {section === 'memory' && (
                <>
                  <Field id="semanticMemory" label={lbl('semanticMemory', 'Semantic memory')} help={hlp('semanticMemory', '')}>
                    <Toggle id="semanticMemory" label={lbl('semanticMemory', 'Semantic memory')} checked={draft.semanticMemory} onChange={(v) => patch('semanticMemory', v)} />
                  </Field>
                  <Field id="knowledgeGraph" label={lbl('knowledgeGraph', 'Knowledge Graph')} help={hlp('knowledgeGraph', '')}>
                    <Toggle id="knowledgeGraph" label={lbl('knowledgeGraph', 'Knowledge Graph')} checked={draft.knowledgeGraph} onChange={(v) => patch('knowledgeGraph', v)} />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>
        {dirty ? (
          <div className="ps-save" role="status">
            <span className="ps-save-count">
              {changes.length} {t('settings.unsavedChanges', { defaultValue: 'unsaved changes' })}
            </span>
            <span className="ps-save-spacer" />
            <Button variant="ghost" onClick={() => setReview(true)}>{t('settings.review', { defaultValue: 'Review' })}</Button>
            <Button variant="secondary" onClick={discard}>{t('settings.discard', { defaultValue: 'Discard' })}</Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? t('settings.saving') : t('common.save', { defaultValue: 'Save' })}
              <Kbd>⌘S</Kbd>
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent
          title={t('settings.reviewTitle', { defaultValue: 'Review changes' })}
          description={t('settings.reviewDesc', { defaultValue: 'Nothing is written until you Save.' })}
        >
          <div className="ps-review">
            {changes.map((c) => (
              <div key={c.key} className="ps-review-row">
                <span>{c.label}</span>
                <span className="ps-review-from">{c.from}</span>
                <span className="ps-review-to">{c.to}</span>
              </div>
            ))}
          </div>
          <div className="ps-actions">
            <Button variant="secondary" onClick={discard}>{t('settings.discard', { defaultValue: 'Discard' })}</Button>
            <Button onClick={() => void save()} disabled={busy}>{t('common.save', { defaultValue: 'Save' })}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leave} onOpenChange={setLeave}>
        <DialogContent
          title={t('settings.leaveTitle', { defaultValue: 'Unsaved changes' })}
          description={t('settings.unsavedWarning', { defaultValue: 'You have unsaved settings. Leave anyway and lose them?' })}
        >
          <div className="ps-actions">
            <Button variant="secondary" onClick={() => { setLeave(false); pendingHref.current = null; }}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button variant="danger" onClick={() => {
              discard();
              setLeave(false);
              const href = pendingHref.current;
              pendingHref.current = null;
              if (href) window.location.hash = href;
            }}>
              {t('settings.discard', { defaultValue: 'Discard' })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {highlight ? (
        <style>{`#setting-${highlight}{box-shadow:var(--paper-focus-ring);border-color:var(--paper-accent-9);}`}</style>
      ) : null}
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
