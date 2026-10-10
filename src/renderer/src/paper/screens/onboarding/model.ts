import { suggestedForkHome } from '@shared/forkHomeSuggest';
import { APP_DISPLAY_NAME } from '@shared/forkIdentity';

export type OnboardStep = 'engines' | 'workspace' | 'meet';
export const ONBOARD_STEPS: OnboardStep[] = ['engines', 'workspace', 'meet'];

export type EngineState = 'installed' | 'installs-on-first-run' | 'not-installable' | 'failed';

export type EngineCard = {
  id: string;
  label: string;
  blurb: string;
  state: EngineState;
  recommended?: boolean;
  installCommand: string;
  logTail?: string;
};

export type OnboardDraft = {
  step: OnboardStep;
  engine: string;
  home: string;
  repos: string[];
  officeName: string;
  sample: boolean;
  autoMode: boolean;
  skippedEngine: boolean;
  advancedOpen: boolean;
};

const KEY = 'paper.onboarding.draft';

export const DEMO_ENGINES: EngineCard[] = [
  {
    id: 'claude', label: 'Claude Code', blurb: 'Anthropic — recommended orchestrator.',
    state: 'installed', recommended: true, installCommand: 'npm i -g @anthropic-ai/claude-code'
  },
  {
    id: 'codex', label: 'Codex', blurb: 'OpenAI Codex CLI.',
    state: 'installs-on-first-run', installCommand: 'npm i -g @openai/codex'
  },
  {
    id: 'grok', label: 'Grok', blurb: 'xAI Grok CLI.',
    state: 'failed',
    installCommand: 'npm i -g @xai/grok',
    logTail: 'npm ERR! 404 Not Found - GET https://registry.npmjs.org/@xai/grok\nnpm ERR! 404  \'@xai/grok\' is not in this registry.\nnpm ERR! A complete log of this run can be found in: ~/.npm/_logs/install.log'
  },
  {
    id: 'cursor', label: 'Cursor', blurb: 'Uses your Cursor credits.',
    state: 'not-installable', installCommand: 'Download Cursor from cursor.com, then enable the Agent CLI.'
  }
];

export function emptyDraft(platform?: string): OnboardDraft {
  return {
    step: 'engines',
    engine: 'claude',
    home: suggestedForkHome(platform),
    repos: [],
    officeName: APP_DISPLAY_NAME,
    sample: false,
    autoMode: true,
    skippedEngine: false,
    advancedOpen: false
  };
}

export function loadDraft(platform?: string): OnboardDraft {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OnboardDraft>;
      return { ...emptyDraft(platform), ...parsed };
    }
  } catch { /* noop */ }
  return emptyDraft(platform);
}

export function saveDraft(d: OnboardDraft): void {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* noop */ }
}

export function clearDraft(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function stepIndex(s: OnboardStep): number {
  return ONBOARD_STEPS.indexOf(s);
}
