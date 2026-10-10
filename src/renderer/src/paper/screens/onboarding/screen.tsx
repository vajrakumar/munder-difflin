/** Onboarding (MDF-21): three steps, under two minutes. MDF-48 fork home default. */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Input, Label, cx } from '@/ui';
import { APP_DISPLAY_NAME } from '@shared/forkIdentity';
import { suggestedForkHome } from '@shared/forkHomeSuggest';
import type { PaperRoute } from '../../routes';
import {
  DEMO_ENGINES, ONBOARD_STEPS, clearDraft, loadDraft, saveDraft, stepIndex,
  type EngineCard, type OnboardDraft, type OnboardStep
} from './model';
import '../../common/common.css';
import './onboarding.css';

export const route: PaperRoute = 'onboarding';

function platform(): string {
  try {
    const p = (window as { cth?: { platform?: string } }).cth?.platform;
    if (p) return p;
  } catch { /* gallery */ }
  return 'darwin';
}

export function Screen(): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<OnboardDraft>(() => loadDraft(platform()));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [repo, setRepo] = useState('');

  useEffect(() => { saveDraft(draft); }, [draft]);

  const engines = DEMO_ENGINES;
  const selected: EngineCard | undefined = engines.find((e) => e.id === draft.engine);
  const failed = selected?.state === 'failed' || selected?.state === 'not-installable';
  const blocked = failed && !draft.skippedEngine;
  const idx = stepIndex(draft.step);

  function set<K extends keyof OnboardDraft>(key: K, value: OnboardDraft[K]): void {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function go(step: OnboardStep): void {
    setDraft((d) => ({ ...d, step }));
  }

  function next(): void {
    if (draft.step === 'engines') {
      if (blocked) return;
      go('workspace');
      return;
    }
    if (draft.step === 'workspace') {
      if (!draft.home.trim()) return;
      go('meet');
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      clearDraft();
      setBusy(false);
      setDone(true);
    }, 400);
  }

  const title = useMemo(() => {
    if (draft.step === 'engines') return t('onboarding.titles.engines', { defaultValue: 'Engines' });
    if (draft.step === 'workspace') return t('onboarding.titles.workspace', { defaultValue: 'Workspace' });
    return t('onboarding.titles.meet', { defaultValue: 'Meet your office' });
  }, [draft.step, t]);

  if (done) {
    return (
      <div className="pc-screen po-root">
        <div className="po-card">
          <h1>{t('onboarding.titles.done', { defaultValue: 'All set' })}</h1>
          <p className="po-lede">
            {t('onboarding.meet.ready', {
              defaultValue: '{{name}} is ready. The orchestrator is on {{engine}}.',
              name: draft.officeName || APP_DISPLAY_NAME,
              engine: selected?.label ?? draft.engine
            })}
          </p>
          <Button onClick={() => { window.location.hash = '#/'; }}>{t('onboarding.meet.openOffice', { defaultValue: 'Open the office' })}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-screen po-root">
      <div className="po-card">
        <div className="po-progress" aria-label={t('onboarding.progress', { defaultValue: 'Progress' })}>
          {ONBOARD_STEPS.map((s, i) => (
            <span key={s} className="po-dot" data-on={s === draft.step ? 'true' : undefined} data-done={i < idx ? 'true' : undefined} />
          ))}
          <span className="po-step">{idx + 1} / {ONBOARD_STEPS.length}</span>
        </div>
        <h1>{title}</h1>

        {draft.step === 'engines' && (
          <>
            <p className="po-lede">
              {t('onboarding.orchestrator.desc', { defaultValue: 'Pick the engine that powers your orchestrator. Installed engines are ready now.' })}
            </p>
            {engines.map((e) => (
              <button
                key={e.id}
                type="button"
                className="po-engine"
                aria-pressed={draft.engine === e.id}
                onClick={() => setDraft((d) => ({ ...d, engine: e.id, skippedEngine: false }))}
              >
                <div className="po-engine-body">
                  <div className="po-engine-name">{e.label}</div>
                  <div className="po-engine-blurb">{e.blurb}</div>
                </div>
                {e.recommended ? <Badge tone="accent">{t('onboarding.orchestrator.recommended', { defaultValue: 'Recommended' })}</Badge> : null}
                <Badge tone={e.state === 'installed' ? 'success' : e.state === 'failed' ? 'danger' : 'neutral'}>
                  {e.state === 'installed' ? 'Installed' : e.state === 'installs-on-first-run' ? 'Installs on first run' : e.state === 'failed' ? 'Install failed' : 'Not installed'}
                </Badge>
              </button>
            ))}
            {failed && selected ? (
              <div className="po-fail" role="alert">
                <strong>{t('onboarding.installFailed', { defaultValue: 'This engine failed to install.' })}</strong>
                {selected.logTail ? <pre>{selected.logTail}</pre> : null}
                <div className="po-cmd">{selected.installCommand}</div>
                <label className={cx('po-warn')}>
                  <input
                    type="checkbox"
                    checked={draft.skippedEngine}
                    onChange={(e) => set('skippedEngine', e.target.checked)}
                  />{' '}
                  {t('onboarding.skipWarn', { defaultValue: 'Skip anyway — the orchestrator will not start until this engine is installed.' })}
                </label>
              </div>
            ) : null}
          </>
        )}

        {draft.step === 'workspace' && (
          <>
            <p className="po-lede">
              {t('onboarding.home.descFork', {
                defaultValue: 'The hive folder defaults to the pinned fork home so this install never shares the live office. Repos are optional.'
              })}
            </p>
            <Label htmlFor="po-home">{t('settings.general.homeFolder', { defaultValue: 'Home folder' })}</Label>
            <div className="po-home">
              <Input
                id="po-home"
                value={draft.home}
                onChange={(e) => set('home', e.target.value)}
                placeholder={suggestedForkHome(platform())}
              />
              <Button
                variant="secondary"
                onClick={() => set('home', suggestedForkHome(platform()))}
              >
                {t('onboarding.home.resetDefault', { defaultValue: 'Use fork home' })}
              </Button>
            </div>
            <Label htmlFor="po-repo">{t('onboarding.repos.addRepo', { defaultValue: 'Add a repo' })}</Label>
            <div className="po-home">
              <Input
                id="po-repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="/path/to/project"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && repo.trim()) {
                    e.preventDefault();
                    if (!draft.repos.includes(repo.trim())) set('repos', [...draft.repos, repo.trim()]);
                    setRepo('');
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!repo.trim()) return;
                  if (!draft.repos.includes(repo.trim())) set('repos', [...draft.repos, repo.trim()]);
                  setRepo('');
                }}
              >
                {t('common.add', { defaultValue: 'Add' })}
              </Button>
            </div>
            <div className="po-repos">
              {draft.repos.length === 0 ? (
                <p className="po-lede">{t('onboarding.repos.empty', { defaultValue: 'No repos yet. Optional — you can add one later.' })}</p>
              ) : draft.repos.map((r) => (
                <div key={r} className="po-repo">
                  <span>{r}</span>
                  <Button size="sm" variant="ghost" onClick={() => set('repos', draft.repos.filter((x) => x !== r))}>×</Button>
                </div>
              ))}
            </div>
            <details className="po-adv" open={draft.advancedOpen} onToggle={(e) => set('advancedOpen', (e.target as HTMLDetailsElement).open)}>
              <summary>{t('onboarding.advanced', { defaultValue: 'Advanced — permissions and reliability' })}</summary>
              <div className="po-adv-body">
                <label>
                  <input type="checkbox" checked={draft.autoMode} onChange={(e) => set('autoMode', e.target.checked)} />{' '}
                  {t('onboarding.permissions.autoLabel', { defaultValue: 'Work autonomously' })}
                </label>
                <p className="po-lede">{t('onboarding.permissions.autoNote', { defaultValue: 'You can change this later per agent.' })}</p>
              </div>
            </details>
          </>
        )}

        {draft.step === 'meet' && (
          <>
            <p className="po-lede">
              {t('onboarding.meet.lede', { defaultValue: 'Name the office, start the orchestrator, and optionally drop in a sample task.' })}
            </p>
            <Label htmlFor="po-name">{t('onboarding.meet.name', { defaultValue: 'Office name' })}</Label>
            <Input
              id="po-name"
              value={draft.officeName}
              onChange={(e) => set('officeName', e.target.value)}
              placeholder={APP_DISPLAY_NAME}
            />
            <p className="po-help po-lede">{t('onboarding.meet.nameHelp', { defaultValue: 'Defaults to Vajra\'s Office.' })}</p>
            <label>
              <input type="checkbox" checked={draft.sample} onChange={(e) => set('sample', e.target.checked)} />{' '}
              {t('onboarding.meet.sample', { defaultValue: 'Add a sample task for the orchestrator' })}
            </label>
          </>
        )}

        <div className="po-foot">
          <Button
            variant="ghost"
            onClick={() => go(idx <= 0 ? 'engines' : ONBOARD_STEPS[idx - 1])}
            disabled={idx === 0}
          >
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <div className="po-foot-right">
            <Button onClick={next} disabled={busy || (draft.step === 'engines' && blocked) || (draft.step === 'workspace' && !draft.home.trim())}>
              {draft.step === 'meet'
                ? (busy ? t('common.saving') : t('onboarding.meet.start', { defaultValue: 'Start the orchestrator' }))
                : t('common.next', { defaultValue: 'Next' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
