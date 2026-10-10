import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { PixelPanel } from './PixelPanel';
import { PixelButton } from './PixelButton';
import { Icon, type IconName } from './Icon';
import { SpritePortrait } from './SpritePortrait';
import { ProviderLogo } from './ProviderLogo';
import { modelsForProvider, onboardingEngineChoices, type AgentProvider, type HarnessConfig } from '@/store/config';
import { suggestedForkHome } from '@shared/forkHomeSuggest';
import { APP_DISPLAY_NAME } from '@shared/forkIdentity';
import { providerPreset } from '@shared/agentProvider';
import {
  classifyEngineAvailability, engineAvailabilityBadge, engineAvailabilityMessage, engineBlocksOnboarding
} from '@shared/engineAvailability';
import type { ToolStatus } from '@shared/toolCatalog';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';

export interface OnboardingWizardProps {
  onComplete: (config: HarnessConfig) => void;
}

type Audience = 'technical' | 'non-technical';
type Step = 'engines' | 'workspace' | 'meet';

// First-run showcase "— the highest-value features a brand-new user should grasp
// before any setup. Labels and copy live in i18n (two registers: `desc` for the
// technical audience, `descPlain` for the plain-language one "— item 1).
interface Feature {
  icon: IconName;
  labelKey: string;
  descKey: string;       // technical register
  descPlainKey: string;  // non-technical register
  tint: string;          // tile background token
  edge: string;          // tile border token
}
const FEATURES: Feature[] = [
  {
    icon: 'mcp',
    labelKey: 'onboarding.welcome.features.engines.label',
    descKey: 'onboarding.welcome.features.engines.desc',
    descPlainKey: 'onboarding.welcome.features.engines.descPlain',
    tint: 'var(--cth-lilac-light)', edge: 'var(--cth-lilac)'
  },
  {
    icon: 'gear',
    labelKey: 'onboarding.welcome.features.clone.label',
    descKey: 'onboarding.welcome.features.clone.desc',
    descPlainKey: 'onboarding.welcome.features.clone.descPlain',
    tint: 'var(--cth-sky-light)', edge: 'var(--cth-sky)'
  },
  {
    icon: 'web',
    labelKey: 'onboarding.welcome.features.memory.label',
    descKey: 'onboarding.welcome.features.memory.desc',
    descPlainKey: 'onboarding.welcome.features.memory.descPlain',
    tint: 'var(--cth-mint-light)', edge: 'var(--cth-mint)'
  },
  {
    icon: 'terminal',
    labelKey: 'onboarding.welcome.features.commandCenter.label',
    descKey: 'onboarding.welcome.features.commandCenter.desc',
    descPlainKey: 'onboarding.welcome.features.commandCenter.descPlain',
    tint: 'var(--cth-lemon-light)', edge: 'var(--cth-lemon)'
  },
  {
    icon: 'pause',
    labelKey: 'onboarding.welcome.features.guardrails.label',
    descKey: 'onboarding.welcome.features.guardrails.desc',
    descPlainKey: 'onboarding.welcome.features.guardrails.descPlain',
    tint: 'var(--cth-coral-light)', edge: 'var(--cth-coral)'
  },
  {
    icon: 'sparkle',
    labelKey: 'onboarding.welcome.features.hires.label',
    descKey: 'onboarding.welcome.features.hires.desc',
    descPlainKey: 'onboarding.welcome.features.hires.descPlain',
    tint: 'var(--cth-peach-light)', edge: 'var(--cth-peach)'
  }
];

// One-liner of what each engine is, shown under its row on the orchestrator step
// so a non-technical user knows what they're picking (item 3).
const PROVIDER_BLURB_KEYS: Partial<Record<AgentProvider, string>> = {
  gemini: 'onboarding.providerBlurb.gemini',
  claude: 'onboarding.providerBlurb.claude',
  codex: 'onboarding.providerBlurb.codex',
  antigravity: 'onboarding.providerBlurb.antigravity',
  qwen: 'onboarding.providerBlurb.qwen',
  cursor: 'onboarding.providerBlurb.cursor'
};

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation();
  // Onboarding runs before god exists in the store, so read the persisted name.
  const godName = useResolvedGodName();
  const [step, setStep] = useState<Step>('engines');
  // Self-identified audience (item 1). Undefined until chosen on the first screen;
  // the rest of the wizard reads `plain` to swap copy registers.
  const [audience, setAudience] = useState<Audience | undefined>();
  const plain = audience === 'non-technical';

  const [home, setHome] = useState<string>('');
  const [repos, setRepos] = useState<string[]>([]);
  const [autoMode, setAutoMode] = useState<boolean>(true);
  // Anonymous usage stats (TELEMETRY.md). Default ON (opt-out); persisted by
  // finish() so unchecking before finishing means nothing is ever sent.
  const [shareStats, setShareStats] = useState<boolean>(true);
  const [godProvider, setGodProvider] = useState<AgentProvider>('claude');
  const [godModel, setGodModel] = useState<string | undefined>(
    providerPreset('claude').recommendedOrchestratorModel
  );
  const [officeName, setOfficeName] = useState(APP_DISPLAY_NAME);
  const [sampleTask, setSampleTask] = useState(false);
  const [skippedEngine, setSkippedEngine] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  // Which engine CLIs are actually on this machine. The picker used to record the
  // choice blind; the first check happened when Michael spawned, and for a
  // provider with no installer that meant a first run where nothing ever booted.
  // `undefined` = probe not back yet (or failed): rows show no badge and nothing
  // is blocked, because a broken probe must not lock a new user out.
  const [engines, setEngines] = useState<ToolStatus[] | undefined>();
  const [probing, setProbing] = useState(false);
  const probeEngines = async () => {
    setProbing(true);
    try { setEngines(await window.cth.toolsStatus()); }
    catch { /* leave undefined: unknown, never blocking */ }
    finally { setProbing(false); }
  };
  useEffect(() => { void probeEngines(); }, []);
  const selectedEngine = classifyEngineAvailability(engines, godProvider);
  const engineBlocked = engineBlocksOnboarding(selectedEngine);

  // Permissions & reliability toggles. These apply IMMEDIATELY on change (their
  // own IPC / OS state) "— they are NOT part of finish()'s config write. First-run
  // defaults: notifications off (config default), login-item off (fresh install);
  // each reconciles to the real state the IPC returns.
  const [strongKeepalive, setStrongKeepalive] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [openAtLogin, setOpenAtLogin] = useState(false);

  const toggleStrongKeepalive = async (v: boolean) => {
    setStrongKeepalive(v); // optimistic
    try { setStrongKeepalive((await window.cth.updateConfig({ strongKeepalive: v })).strongKeepalive === true); }
    catch { setStrongKeepalive(!v); }
  };
  const toggleNotifications = async (v: boolean) => {
    setNotifications(v); // optimistic
    try { await window.cth.setNotifications(v); }
    catch { setNotifications(!v); } // revert on failure
  };
  const toggleOpenAtLogin = async (v: boolean) => {
    setOpenAtLogin(v); // optimistic
    try { setOpenAtLogin(await window.cth.setLoginItem(v)); } // reconcile to OS truth
    catch { setOpenAtLogin(!v); }
  };
  const openSettings = (url: string) => { void window.cth.openExternal(url); };

  // Power-settings deep-link differs per OS (macOS/Windows have one, Linux
  // doesn't have a universal settings URI across desktop environments) —
  // drive the copy and the button off the actual platform instead of
  // hardcoding one OS's instructions.
  const platform = window.cth.platform;
  const stayAwakeOs: 'mac' | 'windows' | 'linux' =
    platform === 'darwin' ? 'mac' : platform === 'win32' ? 'windows' : 'linux';
  const stayAwakeUrl =
    stayAwakeOs === 'mac' ? 'x-apple.systempreferences:com.apple.preference.battery' :
    stayAwakeOs === 'windows' ? 'ms-settings:powersleep' :
    null;

  // MDF-48: first-run Home is the pinned fork home (FORK_HOME_DIR_NAME under
  // the fork userData), never ~/HarnessAgents — accepting that path created a
  // third hive beside the live office and the fork's own home.
  useEffect(() => {
    if (!home) setHome(suggestedForkHome(window.cth.platform));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const DRAFT_KEY = 'cth.onboardingDraft';
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<{
          step: Step; home: string; repos: string[]; godProvider: AgentProvider;
          godModel: string; officeName: string; sampleTask: boolean; autoMode: boolean;
          audience: Audience; skippedEngine: boolean;
        }>;
        if (d.step === 'engines' || d.step === 'workspace' || d.step === 'meet') setStep(d.step);
        if (d.home) setHome(d.home);
        if (Array.isArray(d.repos)) setRepos(d.repos);
        if (d.godProvider) setGodProvider(d.godProvider);
        if (d.godModel) setGodModel(d.godModel);
        if (d.officeName) setOfficeName(d.officeName);
        if (typeof d.sampleTask === 'boolean') setSampleTask(d.sampleTask);
        if (typeof d.autoMode === 'boolean') setAutoMode(d.autoMode);
        if (d.audience) setAudience(d.audience);
        if (d.skippedEngine) setSkippedEngine(true);
      }
    } catch { /* ignore a corrupt draft */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        step, home, repos, godProvider, godModel, officeName, sampleTask, autoMode, audience, skippedEngine
      }));
    } catch { /* noop */ }
  }, [hydrated, step, home, repos, godProvider, godModel, officeName, sampleTask, autoMode, audience, skippedEngine]);

  const pickHome = async () => {
    setError(undefined);
    const res = await window.cth.chooseFolder();
    if (res.ok) setHome(res.path);
    else if (res.error !== 'cancelled') setError(res.error);
  };

  const pickRepo = async () => {
    setError(undefined);
    const res = await window.cth.chooseFolder();
    if (res.ok && !repos.includes(res.path)) setRepos([...repos, res.path]);
    else if (!res.ok && res.error !== 'cancelled') setError(res.error);
  };

  const removeRepo = (path: string) => setRepos(repos.filter(r => r !== path));

  const finish = async () => {
    setBusy(true);
    setError(undefined);
    const harnessHome = home.trim(); // whitespace-only is not a folder
    if (!harnessHome) { setError(t('onboarding.errPickHome')); setBusy(false); setStep('workspace'); return; }
    // The orchestrator step already refuses to advance on this, but a late probe
    // result can change the answer after the user has moved on. Never write a
    // godProvider that is known to be unable to boot.
    if (engineBlocked && !skippedEngine) {
      setError(t('onboarding.errEngineNotInstalled', { label: providerPreset(godProvider).label }));
      setBusy(false); setStep('engines'); return;
    }
    const ensure = await window.cth.ensureHarnessHome(harnessHome);
    if (!ensure.ok) {
      setError(ensure.error ?? t('onboarding.errCreateHome'));
      setBusy(false);
      return;
    }
    const next = await window.cth.updateConfig({
      onboardingComplete: true,
      audience: audience ?? 'technical',
      harnessHome, // the same trimmed value we just mkdir'd, not the raw field
      registeredRepos: repos,
      autoMode,
      godProvider,
      godModel,
      telemetryEnabled: shareStats
    });
    try { localStorage.removeItem('cth.onboardingDraft'); } catch { /* noop */ }
    setBusy(false);
    onComplete(next);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--cth-cream-200)',
      backgroundImage:
        `repeating-linear-gradient(45deg, rgba(232, 217, 160, 0.4) 0 1px, transparent 1px 8px)`,
      // Scroll the overlay rather than clip the wizard. Step 2 lists every
      // installed CLI engine (8 rows + a model select), which is taller than a
      // 1080p-class window once the OS chrome is subtracted "— the panel was
      // being cut off at BOTH edges with no way to reach the buttons.
      display: 'flex',
      overflowY: 'auto',
      zIndex: 200,
      padding: 32
    }}>
      {/* `margin: auto` centers, NOT `align-items: center`. A centered flex item
          that overflows its container is clipped at the TOP and unreachable by
          scrolling (the overflow spills past the scroll origin); auto margins
          center while it fits and collapse to a normal scroll once it doesn't. */}
      <div style={{ width: 640, maxWidth: '94vw', margin: 'auto' }}>
        <PixelPanel
          variant="dialog"
          title={
            step === 'engines' ? t('onboarding.titles.engines', { defaultValue: 'STEP 1 OF 3 · ENGINES' })
            : step === 'workspace' ? t('onboarding.titles.workspace', { defaultValue: 'STEP 2 OF 3 · WORKSPACE' })
            : t('onboarding.titles.meet', { defaultValue: 'STEP 3 OF 3 · MEET YOUR OFFICE' })
          }
          noPadding
        >
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '86vh', overflowY: 'auto' }}>

            {false && step === 'meet' && audience === undefined && (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 56, height: 56, flexShrink: 0,
                    background: 'var(--cth-sky-light)',
                    boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden'
                  }}>
                    <SpritePortrait character="michael" scale={2} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 12, lineHeight: '18px' }}>
                      {t('onboarding.persona.headline')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: '19px' }}>
                      {t('onboarding.persona.body')}
                      <span style={{ color: 'var(--cth-ink-500)' }}>{t('onboarding.persona.bodyLocal')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, color: 'var(--cth-ink-700)' }}>
                  {t('onboarding.persona.ask')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <PersonaCard
                    icon="code"
                    title={t('onboarding.persona.technicalTitle')}
                    desc={t('onboarding.persona.technicalDesc')}
                    selected={audience === 'technical'}
                    onClick={() => { setAudience('technical'); setError(undefined); }}
                  />
                  <PersonaCard
                    icon="sparkle"
                    title={t('onboarding.persona.nonTechnicalTitle')}
                    desc={t('onboarding.persona.nonTechnicalDesc')}
                    selected={audience === 'non-technical'}
                    onClick={() => { setAudience('non-technical'); setError(undefined); }}
                  />
                </div>
              </>
            )}

            {false && (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, flexShrink: 0,
                    background: 'var(--cth-sky-light)',
                    boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden'
                  }}>
                    <SpritePortrait character="michael" scale={2} />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--cth-font-display)',
                      fontSize: 12, lineHeight: '18px'
                    }}>{t('onboarding.welcome.headline')}</div>
                    <div style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: '18px' }}>
                      {plain ? t('onboarding.welcome.descPlain') : t('onboarding.welcome.desc')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FEATURES.map((f) => (
                    <div key={f.labelKey} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: 10,
                      background: f.tint,
                      boxShadow: `inset 0 0 0 2px ${f.edge}`
                    }}>
                      <div style={{
                        width: 28, height: 28, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--cth-paper-100)',
                        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                      }}>
                        <Icon name={f.icon} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--cth-font-display)',
                          fontSize: 10, lineHeight: '14px', marginBottom: 3
                          // These labels are literal caps to match their siblings, so
                          // the orchestrator's name has to arrive upper-cased too.
                        }}>{t(f.labelKey, { godName: godName.toUpperCase() })}</div>
                        <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>
                          {plain ? t(f.descPlainKey) : t(f.descKey)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === 'workspace' && (
              <>
                <p style={{ margin: 0, lineHeight: '22px' }}>
                  {plain ? t('onboarding.home.descPlain') : t('onboarding.home.desc')}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                    placeholder={t('onboarding.home.placeholder')}
                    style={inputStyle}
                  />
                  <PixelButton variant="secondary" size="md" onClick={pickHome}>
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <Icon name="folder" /> {plain ? t('onboarding.home.createPick') : t('onboarding.home.pick')}
                    </span>
                  </PixelButton>
                </div>
                <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                  {plain ? t('onboarding.home.notePlain') : t('onboarding.home.note')}
                </div>
              </>
            )}

            {step === 'engines' && (
              <>
                <p style={{ margin: 0, lineHeight: '22px' }}>
                  {plain ? t('onboarding.orchestrator.descPlain') : t('onboarding.orchestrator.desc')}
                </p>

                {/* What is a CLI agent / your clone "— item 3 */}
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10,
                  background: 'var(--cth-lemon-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                  fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-700)'
                }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="sparkle" /></span>
                  <span>
                    {plain ? (
                      <Trans i18nKey="onboarding.orchestrator.cliAgentPlain" components={{ strong: <strong /> }}>
                        A <strong>CLI agent</strong> is an AI coding assistant that runs on your
                        computer — popular ones are Claude Code (Anthropic), Codex (OpenAI) and
                        Antigravity (Google Gemini). <strong>Your clone</strong> is the always-on
                        one that runs your whole office. We recommend Claude Code on Opus 4.8 (1M).
                        You can add or switch the others later.
                      </Trans>
                    ) : (
                      <Trans i18nKey="onboarding.orchestrator.cliAgent" components={{ strong: <strong /> }}>
                        Each option is a <strong>CLI engine</strong> (Claude Code, Codex,
                        Antigravity/Gemini, or a local proxy like Qwen). Engines marked
                        INSTALLED are already on this machine; INSTALLS ON FIRST RUN means the app
                        sets it up when Michael first starts.
                        <strong> Your clone</strong> (Michael) is the engine that orchestrates the whole
                        hive. Recommended: Claude Code · Opus 4.8 · 1M. Other providers can be wired
                        per agent later.
                      </Trans>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {onboardingEngineChoices().eligible.map((p) => {
                    const sel = godProvider === p.id;
                    return (
                      <label key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px',
                        background: sel ? 'var(--cth-mint-light)' : 'var(--cth-paper-100)',
                        boxShadow: `inset 0 0 0 ${sel ? 2 : 1}px ${sel ? 'var(--cth-mint)' : 'var(--cth-ink-300)'}`,
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="godProvider"
                          value={p.id}
                          checked={sel}
                          onChange={() => {
                            setGodProvider(p.id);
                            // Reset the model to the new provider's recommended pick so the
                            // dropdown below always shows a valid model for the chosen engine.
                            setGodModel(p.recommendedOrchestratorModel);
                          }}
                          style={{ width: 16, height: 16, flexShrink: 0 }}
                        />
                        <span style={{
                          width: 22, height: 22, flexShrink: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: 'var(--cth-ink-900)'
                        }}>
                          <ProviderLogo provider={p.id} size={18} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: 'var(--cth-font-display)', fontSize: 11 }}>
                            {p.label.toUpperCase()}
                          </span>
                          {PROVIDER_BLURB_KEYS[p.id] && (
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--cth-ink-500)' }}>
                              {t(PROVIDER_BLURB_KEYS[p.id]!)}
                            </span>
                          )}
                        </span>
                        {(() => {
                          const a = classifyEngineAvailability(engines, p.id);
                          const badge = engineAvailabilityBadge(a);
                          if (!badge) return null;
                          const bad = a.state === 'not-installable';
                          return (
                            <span title={a.path ?? undefined} style={{
                              fontSize: 10, padding: '1px 5px', lineHeight: '16px',
                              background: a.state === 'installed' ? 'var(--cth-mint-light)' : bad ? 'var(--cth-paper-100)' : 'var(--cth-cream-200)',
                              color: bad ? 'var(--cth-ink-500)' : 'var(--cth-ink-900)',
                              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                              fontFamily: 'var(--cth-font-display)', flexShrink: 0
                            }}>{badge}</span>
                          );
                        })()}
                        {p.id === 'claude' && (
                          <span style={{
                            fontSize: 10, padding: '1px 5px', lineHeight: '16px',
                            background: 'var(--cth-lemon)',
                            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                            fontFamily: 'var(--cth-font-display)', flexShrink: 0
                          }}>{t('onboarding.orchestrator.recommended')}</span>
                        )}
                      </label>
                    );
                  })}
                  {/* Engines a WORKER can run but Michael cannot (issue #355): shown
                      disabled instead of hidden, so "Copilot is missing" reads as the
                      real constraint — no inbox drain path — not as "unsupported". */}
                  {onboardingEngineChoices().workersOnly.map((p) => (
                    <label key={p.id} aria-disabled title={t('onboarding.orchestrator.workersOnlyHint')} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px',
                      background: 'var(--cth-paper-100)',
                      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                      cursor: 'not-allowed', opacity: 0.75
                    }}>
                      <input type="radio" name="godProvider" value={p.id} checked={false} disabled
                        style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <span style={{
                        width: 22, height: 22, flexShrink: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--cth-ink-500)'
                      }}>
                        <ProviderLogo provider={p.id} size={18} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--cth-font-display)', fontSize: 11, color: 'var(--cth-ink-500)' }}>
                          {p.label.toUpperCase()}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--cth-ink-500)' }}>
                          {t('onboarding.orchestrator.workersOnlyHint')}
                        </span>
                      </span>
                      <span style={{
                        fontSize: 10, padding: '1px 5px', lineHeight: '16px',
                        background: 'var(--cth-paper-100)', color: 'var(--cth-ink-500)',
                        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                        fontFamily: 'var(--cth-font-display)', flexShrink: 0
                      }}>{t('onboarding.orchestrator.workersOnly')}</span>
                    </label>
                  ))}
                </div>
                {engineBlocked && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 8, padding: 10,
                    background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 2px var(--cth-ink-900)',
                    fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-900)'
                  }}>
                    <span>{engineAvailabilityMessage(selectedEngine, providerPreset(godProvider).label)}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <PixelButton variant="secondary" size="sm" onClick={() => { void probeEngines(); }} disabled={probing}>
                        {probing ? 'checking...' : 'check again'}
                      </PixelButton>
                      {selectedEngine.docsUrl && (
                        <PixelButton variant="ghost" size="sm" onClick={() => { void window.cth.openExternal(selectedEngine.docsUrl!); }}>
                          install instructions
                        </PixelButton>
                      )}
                    </div>
                    {selectedEngine.installCommand ? (
                      <code style={{ fontSize: 11, overflowWrap: 'anywhere' }}>{selectedEngine.installCommand}</code>
                    ) : null}
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                      <input type="checkbox" checked={skippedEngine} onChange={(e) => setSkippedEngine(e.target.checked)} />
                      {t('onboarding.skipWarn', { defaultValue: 'Skip anyway — the orchestrator will not start until this engine is installed.' })}
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('onboarding.orchestrator.model')}</div>
                  <select
                    value={godModel ?? ''}
                    onChange={(e) => setGodModel(e.target.value || undefined)}
                    style={inputStyle}
                  >
                    {modelsForProvider(godProvider).map((m) => (
                      <option key={m.label} value={m.id ?? ''}>{m.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                    {t('onboarding.orchestrator.modelNote')}
                  </div>
                </div>
              </>
            )}

            {step === 'workspace' && (
              <>
                <p style={{ margin: 0, lineHeight: '22px' }}>
                  {plain ? t('onboarding.repos.descPlain') : t('onboarding.repos.desc')}
                </p>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  maxHeight: 200, overflowY: 'auto'
                }}>
                  {repos.length === 0 && (
                    <div style={{
                      padding: 12,
                      fontSize: 13,
                      color: 'var(--cth-ink-500)',
                      background: 'var(--cth-paper-200)',
                      textAlign: 'center'
                    }}>
                      {plain ? t('onboarding.repos.emptyPlain') : t('onboarding.repos.empty')}
                    </div>
                  )}
                  {repos.map((r) => (
                    <div key={r} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px',
                      background: 'var(--cth-paper-100)',
                      boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)'
                    }}>
                      <Icon name="folder" />
                      <span style={{
                        flex: 1,
                        fontFamily: 'var(--cth-font-mono)', fontSize: 13,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{r}</span>
                      <PixelButton variant="ghost" size="sm" onClick={() => removeRepo(r)}>
                        <Icon name="x" />
                      </PixelButton>
                    </div>
                  ))}
                </div>
                <PixelButton variant="secondary" size="md" onClick={pickRepo}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <Icon name="plus" /> {plain ? t('onboarding.repos.addProject') : t('onboarding.repos.addRepo')}
                  </span>
                </PixelButton>
              </>
            )}

            {step === 'workspace' && (
              <details>
                <summary style={{ cursor: 'pointer', fontFamily: 'var(--cth-font-display)', fontSize: 10, color: 'var(--cth-ink-700)' }}>
                  {t('onboarding.advanced', { defaultValue: 'Advanced — permissions and reliability' })}
                </summary>
                {/* AUTONOMY — merged from the old "auto mode" step (item 5). One choice
                    that maps to each engine's flag (item 6): autoMode → claude
                    bypassPermissions / codex -a never -s workspace-write (sandbox kept),
                    etc.; off → each engine's ask-first default. */}
                <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, color: 'var(--cth-ink-700)' }}>
                  {t('onboarding.permissions.autonomyHead')}
                </div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 12,
                  background: autoMode ? 'var(--cth-mint-light)' : 'var(--cth-cream-200)',
                  boxShadow: `inset 0 0 0 2px ${autoMode ? 'var(--cth-mint)' : 'var(--cth-ink-500)'}`,
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={autoMode}
                    onChange={(e) => setAutoMode(e.target.checked)}
                    style={{ width: 18, height: 18, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px' }}>
                      {plain ? t('onboarding.permissions.autoLabelPlain') : t('onboarding.permissions.autoLabel')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--cth-ink-700)' }}>
                      {plain
                        ? (autoMode ? t('onboarding.permissions.autoOnPlain') : t('onboarding.permissions.autoOffPlain'))
                        : (autoMode ? t('onboarding.permissions.autoOn') : t('onboarding.permissions.autoOff'))}
                    </div>
                  </div>
                </label>
                <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                  {plain ? t('onboarding.permissions.autoNotePlain') : t('onboarding.permissions.autoNote')}
                </div>

                <div style={{ height: 1, background: 'var(--cth-ink-300)', margin: '2px 0' }} />

                {/* RELIABILITY "— keeping work firing while you're away. */}
                <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, color: 'var(--cth-ink-700)' }}>
                  {t('onboarding.permissions.reliabilityHead')}
                </div>
                <p style={{ margin: 0, lineHeight: '20px', fontSize: 12, color: 'var(--cth-ink-700)' }}>
                  {plain ? t('onboarding.permissions.reliabilityDescPlain') : t('onboarding.permissions.reliabilityDesc')}
                </p>

                <ToggleRow
                  icon="clock"
                  label={t('onboarding.permissions.keepAwake')}
                  desc={t('onboarding.permissions.keepAwakeDesc')}
                  on={strongKeepalive}
                  tint="var(--cth-mint-light)"
                  edge="var(--cth-mint)"
                  onChange={toggleStrongKeepalive}
                />

                <ToggleRow
                  icon="bell"
                  label={t('onboarding.permissions.notifications')}
                  desc={t('onboarding.permissions.notificationsDesc')}
                  on={notifications}
                  tint="var(--cth-peach-light)"
                  edge="var(--cth-peach)"
                  onChange={toggleNotifications}
                />

                <ToggleRow
                  icon="play"
                  label={t('onboarding.permissions.openAtLogin')}
                  desc={t('onboarding.permissions.openAtLoginDesc')}
                  on={openAtLogin}
                  tint="var(--cth-sky-light)"
                  edge="var(--cth-sky)"
                  onChange={toggleOpenAtLogin}
                />

                <ToggleRow
                  icon="info"
                  label={t('onboarding.permissions.shareStats')}
                  desc={t('onboarding.permissions.shareStatsDesc')}
                  on={shareStats}
                  tint="var(--cth-lemon-light)"
                  edge="var(--cth-lemon)"
                  onChange={() => setShareStats(!shareStats)}
                />

                {/* LEVER 4 "— instruction-only: the OS won't let the app flip its sleep setting itself, so we deep-link the pane where one exists (macOS/Windows) and fall back to text-only guidance on Linux. */}
                <div style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10,
                  background: 'var(--cth-lemon-light)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                }}>
                  <span style={{
                    width: 28, height: 28, flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                  }}>
                    <Icon name="gear" />
                  </span>
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px', marginBottom: 3 }}>
                        {t('onboarding.permissions.stayAwake')}
                      </div>
                      <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>
                        {t(`onboarding.permissions.stayAwakeDesc${stayAwakeOs === 'mac' ? 'Mac' : stayAwakeOs === 'windows' ? 'Windows' : 'Linux'}`)}
                      </div>
                    </div>
                    {stayAwakeUrl && (
                      <PixelButton variant="secondary" size="sm"
                        onClick={() => openSettings(stayAwakeUrl)}>
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <Icon name="arrow-right" /> {t(`onboarding.permissions.openBattery${stayAwakeOs === 'mac' ? 'Mac' : 'Windows'}`)}
                        </span>
                      </PixelButton>
                    )}
                  </div>
                </div>
              </details>
            )}

            {step === 'meet' && (
              <>
                <p style={{ margin: 0, lineHeight: '22px' }}>
                  {t('onboarding.meet.lede', { defaultValue: 'Name the office, start the orchestrator, and optionally drop in a sample task.' })}
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 10, color: 'var(--cth-ink-700)' }}>
                    {t('onboarding.meet.name', { defaultValue: 'Office name' })}
                  </span>
                  <input value={officeName} onChange={(e) => setOfficeName(e.target.value)} placeholder={APP_DISPLAY_NAME} style={inputStyle} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <PersonaCard
                    icon="code"
                    title={t('onboarding.persona.technicalTitle')}
                    desc={t('onboarding.persona.technicalDesc')}
                    selected={audience !== 'non-technical'}
                    onClick={() => { setAudience('technical'); setError(undefined); }}
                  />
                  <PersonaCard
                    icon="sparkle"
                    title={t('onboarding.persona.nonTechnicalTitle')}
                    desc={t('onboarding.persona.nonTechnicalDesc')}
                    selected={audience === 'non-technical'}
                    onClick={() => { setAudience('non-technical'); setError(undefined); }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={sampleTask} onChange={(e) => setSampleTask(e.target.checked)} />
                  {t('onboarding.meet.sample', { defaultValue: 'Add a sample task for the orchestrator' })}
                </label>
              </>
            )}

            {error && (
              <div style={{
                padding: '6px 10px',
                background: 'var(--cth-coral-light)',
                boxShadow: 'inset 0 0 0 1px var(--cth-coral)',
                fontSize: 13,
                color: 'var(--cth-ink-900)',
                overflowWrap: 'anywhere'
              }}>{error}</div>
            )}

            {/* Footer / nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Dots step={step} />
              <div style={{ display: 'flex', gap: 8 }}>
                {step !== 'engines' && (
                  <PixelButton variant="ghost" size="md" onClick={() => setStep(prevStep(step))} disabled={busy}>
                    {t('common.back')}
                  </PixelButton>
                )}
                {step !== 'meet' && (
                  <PixelButton
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (step === 'workspace' && !home.trim()) {
                        setError(t('onboarding.errPickHome'));
                        return;
                      }
                      if (step === 'engines' && engineBlocked && !skippedEngine) {
                        setError(`${providerPreset(godProvider).label} is not installed. Install it and press "check again", pick another engine, or skip with a warning.`);
                        return;
                      }
                      setError(undefined);
                      setStep(nextStep(step));
                    }}
                    disabled={step === 'engines' && engineBlocked && !skippedEngine}
                  >
                    {t('common.next')}
                  </PixelButton>
                )}
                {step === 'meet' && (
                  <PixelButton variant="primary" size="md" onClick={finish} disabled={busy}>
                    {busy ? t('common.saving') : t('onboarding.meet.start', { defaultValue: 'Start the orchestrator' })}
                  </PixelButton>
                )}
              </div>
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}

function PersonaCard({ icon, title, desc, selected, onClick }: {
  icon: IconName;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', cursor: 'pointer', border: 'none',
        padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
        background: selected ? 'var(--cth-mint-light)' : 'var(--cth-paper-100)',
        boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${selected ? 'var(--cth-mint)' : 'var(--cth-ink-300)'}`
      }}
    >
      <span style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
      }}>
        <Icon name={icon} />
      </span>
      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 11, lineHeight: '15px', color: 'var(--cth-ink-900)' }}>
        {title}
      </span>
      <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>
        {desc}
      </span>
    </button>
  );
}

function ToggleRow({ icon, label, desc, on, tint, edge, onChange }: {
  icon: IconName;
  label: string;
  desc: string;
  on: boolean;
  tint: string; // background token when on
  edge: string; // border token when on
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10,
      background: on ? tint : 'var(--cth-paper-100)',
      boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? edge : 'var(--cth-ink-300)'}`,
      cursor: 'pointer'
    }}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, flexShrink: 0, marginTop: 5 }}
      />
      <span style={{
        width: 28, height: 28, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
      }}>
        <Icon name={icon} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px', marginBottom: 3 }}>
          {label}
        </span>
        <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>
          {desc}
        </span>
      </span>
    </label>
  );
}

function Dots({ step }: { step: Step }) {
  const order: Step[] = ['engines', 'workspace', 'meet'];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {order.map((s) => (
        <span key={s} style={{
          width: 8, height: 8,
          background: s === step ? 'var(--cth-ink-900)' : 'var(--cth-cream-300)',
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
        }} />
      ))}
    </div>
  );
}

function nextStep(s: Step): Step {
  return s === 'engines' ? 'workspace' : 'meet';
}
function prevStep(s: Step): Step {
  return s === 'meet' ? 'workspace' : 'engines';
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px 4px',
  background: 'var(--cth-paper-100)',
  border: 'none',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  fontFamily: 'var(--cth-font-mono)',
  fontSize: 13,
  color: 'var(--cth-ink-900)',
  outline: 'none'
};
