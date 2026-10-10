import { suggestedForkHome } from '@shared/forkHomeSuggest';
import {
  readAccent, readDensity, readOfficeView, writeAccent, writeDensity, writeOfficeView,
  type PaperAccent, type PaperDensity
} from '../../appearancePref';
import { readThemePref, writeThemePref, type PaperThemePref } from '../../themePref';

export type SettingsDraft = {
  theme: PaperThemePref;
  density: PaperDensity;
  accent: PaperAccent;
  officeView: boolean;
  homeFolder: string;
  language: string;
  keepAwake: boolean;
  simpleMode: boolean;
  notifications: boolean;
  autoCompact: boolean;
  autoUpdate: boolean;
  telemetry: boolean;
  defaultModel: string;
  maxTurns: string;
  orchSpawn: boolean;
  autoMode: boolean;
  costCapTokens: string;
  velocity: string;
  brkEnabled: boolean;
  brkHardStop: boolean;
  repeated: string;
  errorStorm: string;
  agentTokenCap: string;
  slackOn: boolean;
  slackChannel: string;
  webhooksOn: boolean;
  freeflow: boolean;
  idleDisconnect: string;
  semanticMemory: boolean;
  knowledgeGraph: boolean;
};

const SNAP_KEY = 'paper.settings.saved';

export const DEMO_DRAFT: SettingsDraft = {
  theme: 'system',
  density: 'comfortable',
  accent: 'indigo',
  officeView: true,
  homeFolder: suggestedForkHome('darwin'),
  language: 'en',
  keepAwake: false,
  simpleMode: false,
  notifications: false,
  autoCompact: false,
  autoUpdate: true,
  telemetry: true,
  defaultModel: 'claude-fable-5',
  maxTurns: '',
  orchSpawn: false,
  autoMode: true,
  costCapTokens: '1000000',
  velocity: '200000',
  brkEnabled: true,
  brkHardStop: false,
  repeated: '8',
  errorStorm: '7',
  agentTokenCap: '',
  slackOn: false,
  slackChannel: '',
  webhooksOn: false,
  freeflow: true,
  idleDisconnect: '180000',
  semanticMemory: true,
  knowledgeGraph: false
};

export const FIELD_LABEL: Record<keyof SettingsDraft, string> = {
  theme: 'Theme',
  density: 'Density',
  accent: 'Accent colour',
  officeView: 'Office view',
  homeFolder: 'Home folder',
  language: 'Language',
  keepAwake: 'Keep awake',
  simpleMode: 'Explain things simply',
  notifications: 'Desktop notifications',
  autoCompact: 'Scheduled auto-compact',
  autoUpdate: 'Auto-update',
  telemetry: 'Anonymous usage stats',
  defaultModel: 'Default agent model',
  maxTurns: 'Max turns per run',
  orchSpawn: 'Orchestrator may spawn temps',
  autoMode: 'Autonomy',
  costCapTokens: 'Floor token budget',
  velocity: 'Token velocity',
  brkEnabled: 'Circuit breaker',
  brkHardStop: 'Hard stop',
  repeated: 'Repeated-tool limit',
  errorStorm: 'Error-storm limit',
  agentTokenCap: 'Per-agent token cap',
  slackOn: 'Slack',
  slackChannel: 'Slack channel',
  webhooksOn: 'Webhook triggers',
  freeflow: 'Free Flow',
  idleDisconnect: 'Idle auto-disconnect',
  semanticMemory: 'Semantic memory',
  knowledgeGraph: 'Knowledge Graph'
};

export type DraftKey = keyof SettingsDraft;

export function formatValue(key: DraftKey, v: SettingsDraft[DraftKey]): string {
  if (key === 'autoMode' && typeof v === 'boolean') return v ? 'Autonomous' : 'Ask-first';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (v === '') return '—';
  if (key === 'idleDisconnect') {
    const n = Number(v);
    if (n === 0) return 'Off';
    if (n === 30_000) return '30 seconds';
    if (n === 60_000) return '1 minute';
    if (n === 180_000) return '3 minutes';
    if (n === 300_000) return '5 minutes';
    return `${n} ms`;
  }
  return String(v);
}

export function diffDraft(saved: SettingsDraft, draft: SettingsDraft): Array<{
  key: DraftKey;
  label: string;
  from: string;
  to: string;
}> {
  const keys = Object.keys(saved) as DraftKey[];
  return keys
    .filter((k) => saved[k] !== draft[k])
    .map((k) => ({
      key: k,
      label: FIELD_LABEL[k],
      from: formatValue(k, saved[k]),
      to: formatValue(k, draft[k])
    }));
}

export function hasCth(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as { cth?: { getConfig?: unknown } }).cth?.getConfig === 'function';
}

function fromLocal(): SettingsDraft {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (raw) return { ...DEMO_DRAFT, ...JSON.parse(raw) as Partial<SettingsDraft> };
  } catch { /* noop */ }
  return {
    ...DEMO_DRAFT,
    theme: readThemePref(),
    density: readDensity(),
    accent: readAccent(),
    officeView: readOfficeView()
  };
}

export async function loadSettings(): Promise<SettingsDraft> {
  if (!hasCth()) return fromLocal();
  try {
    const c = await window.cth.getConfig() as unknown as Record<string, unknown>;
    const brk = (c.circuitBreaker ?? {}) as Record<string, unknown>;
    return {
      ...DEMO_DRAFT,
      theme: readThemePref(),
      density: readDensity(),
      accent: readAccent(),
      officeView: readOfficeView(),
      homeFolder: typeof c.harnessHome === 'string' && c.harnessHome
        ? c.harnessHome
        : suggestedForkHome(window.cth.platform),
      language: (() => {
        try { return localStorage.getItem('cth.language') ?? 'en'; } catch { return 'en'; }
      })(),
      keepAwake: c.strongKeepalive === true,
      simpleMode: c.audience === 'non-technical',
      notifications: c.notifications === true,
      autoCompact: Array.isArray(c.missions)
        && (c.missions as Array<{ id?: string; enabled?: boolean }>)
          .some((m) => m.id === 'compact-maintenance' && m.enabled),
      autoUpdate: c.autoUpdate !== false,
      telemetry: c.telemetryEnabled !== false,
      defaultModel: typeof c.defaultModel === 'string' ? c.defaultModel : DEMO_DRAFT.defaultModel,
      maxTurns: c.maxTurns != null ? String(c.maxTurns) : '',
      orchSpawn: c.orchestratorMaySpawn === true,
      autoMode: c.autoMode !== false,
      costCapTokens: c.costCapTokens != null ? String(c.costCapTokens) : '',
      velocity: brk.tokenVelocityPerMin != null ? String(brk.tokenVelocityPerMin) : '',
      brkEnabled: brk.enabled !== false,
      brkHardStop: brk.hardStop === true,
      repeated: brk.repeatedToolLimit != null ? String(brk.repeatedToolLimit) : '',
      errorStorm: brk.errorStormLimit != null ? String(brk.errorStormLimit) : '',
      agentTokenCap: '',
      slackOn: c.slackEnabled === true,
      slackChannel: typeof c.slackChannelId === 'string' ? c.slackChannelId : '',
      webhooksOn: false,
      freeflow: c.freeflowEnabled !== false,
      idleDisconnect: String((c as { realtimeIdleDisconnectMs?: number }).realtimeIdleDisconnectMs ?? 180_000),
      semanticMemory: c.semanticMemory !== false,
      knowledgeGraph: (c.knowledgeGraph as { enabled?: boolean } | undefined)?.enabled === true
    };
  } catch {
    return fromLocal();
  }
}

export async function persistSettings(draft: SettingsDraft, saved: SettingsDraft): Promise<void> {
  writeThemePref(draft.theme);
  writeDensity(draft.density);
  writeAccent(draft.accent);
  writeOfficeView(draft.officeView);
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  try { localStorage.setItem('cth.language', draft.language); } catch { /* noop */ }

  if (!hasCth()) return;

  const num = (s: string): number | undefined => {
    const n = Number(s);
    return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
  };
  const patch: Record<string, unknown> = {
    strongKeepalive: draft.keepAwake,
    audience: draft.simpleMode ? 'non-technical' : 'technical',
    autoUpdate: draft.autoUpdate,
    telemetryEnabled: draft.telemetry,
    defaultModel: draft.defaultModel,
    maxTurns: num(draft.maxTurns),
    orchestratorMaySpawn: draft.orchSpawn,
    autoMode: draft.autoMode,
    costCapTokens: num(draft.costCapTokens),
    circuitBreaker: {
      enabled: draft.brkEnabled,
      hardStop: draft.brkHardStop,
      tokenVelocityPerMin: num(draft.velocity),
      repeatedToolLimit: num(draft.repeated),
      errorStormLimit: num(draft.errorStorm)
    },
    semanticMemory: draft.semanticMemory,
    knowledgeGraph: { enabled: draft.knowledgeGraph },
    freeflowEnabled: draft.freeflow,
    realtimeIdleDisconnectMs: num(draft.idleDisconnect) ?? 0
  };
  await window.cth.updateConfig(patch as never);
  if (draft.autoCompact !== saved.autoCompact) {
    const cfg = await window.cth.getConfig();
    await window.cth.updateConfig({
      missions: (cfg.missions ?? []).map((m) =>
        m.id === 'compact-maintenance' ? { ...m, enabled: draft.autoCompact } : m
      )
    } as never);
  }
  if (draft.notifications !== saved.notifications) {
    await window.cth.setNotifications(draft.notifications);
  }
}
