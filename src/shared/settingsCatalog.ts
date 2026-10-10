/** Searchable Settings catalog (MDF-21). Labels/help are English source for
 *  search + tests; the screen translates via i18n keys. */

export type SettingsSectionId =
  | 'appearance'
  | 'general'
  | 'prerequisites'
  | 'agents'
  | 'autonomy'
  | 'connections'
  | 'voice'
  | 'memory';

export type SettingField = {
  id: string;
  section: SettingsSectionId;
  label: string;
  help: string;
  keywords: string;
  i18nLabel: string;
  i18nHelp: string;
};

export const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  navKey: string;
  label: string;
}> = [
  { id: 'appearance', navKey: 'settings.nav.appearance', label: 'Appearance' },
  { id: 'general', navKey: 'settings.nav.general', label: 'General' },
  { id: 'prerequisites', navKey: 'settings.nav.prerequisites', label: 'Prerequisites' },
  { id: 'agents', navKey: 'settings.nav.agentsModels', label: 'Agents & Models' },
  { id: 'autonomy', navKey: 'settings.nav.autonomyBudgets', label: 'Autonomy & Budgets' },
  { id: 'connections', navKey: 'settings.nav.connections', label: 'Connections' },
  { id: 'voice', navKey: 'settings.nav.voice', label: 'Voice' },
  { id: 'memory', navKey: 'settings.nav.memoryKnowledge', label: 'Memory & Knowledge' }
];

export const SETTING_FIELDS: SettingField[] = [
  {
    id: 'theme', section: 'appearance', label: 'Theme',
    help: 'Light, dark or high contrast. System follows the OS.',
    keywords: 'theme light dark high contrast hc appearance colour color',
    i18nLabel: 'settings.appearance.theme', i18nHelp: 'settings.appearance.themeHelp'
  },
  {
    id: 'density', section: 'appearance', label: 'Density',
    help: 'How tight the layout is: compact, comfortable or roomy.',
    keywords: 'density compact comfortable roomy spacing padding',
    i18nLabel: 'settings.appearance.density', i18nHelp: 'settings.appearance.densityHelp'
  },
  {
    id: 'accent', section: 'appearance', label: 'Accent colour',
    help: 'The highlight colour used on buttons, badges and focus.',
    keywords: 'accent colour color indigo coral mint sky lemon lilac peach',
    i18nLabel: 'settings.appearance.accent', i18nHelp: 'settings.appearance.accentHelp'
  },
  {
    id: 'officeView', section: 'appearance', label: 'Office view',
    help: 'Keep the pixel office floor as an optional view beside Paper.',
    keywords: 'office view pixel floor classic optional',
    i18nLabel: 'settings.appearance.office', i18nHelp: 'settings.appearance.officeHelp'
  },
  {
    id: 'homeFolder', section: 'general', label: 'Home folder',
    help: 'Where the harness keeps hive state, logs and agent memory.',
    keywords: 'home folder hive harness path change home',
    i18nLabel: 'settings.general.homeFolder', i18nHelp: 'settings.general.homeFolderHelp'
  },
  {
    id: 'language', section: 'general', label: 'Language',
    help: 'Language for the app interface. English is the default.',
    keywords: 'language locale english arabic chinese i18n rtl',
    i18nLabel: 'settings.general.language', i18nHelp: 'settings.general.languageDesc'
  },
  {
    id: 'keepAwake', section: 'general', label: 'Keep Mac awake while agents run',
    help: 'Blocks display sleep so schedules and terminals keep firing on time.',
    keywords: 'keep awake sleep battery keepalive',
    i18nLabel: 'settings.general.keepAwake', i18nHelp: 'settings.general.keepAwakeDesc'
  },
  {
    id: 'simpleMode', section: 'general', label: 'Explain things simply',
    help: 'Agents brief you in plain language instead of engineering shorthand.',
    keywords: 'simple mode audience non-technical plain language',
    i18nLabel: 'settings.general.simpleMode', i18nHelp: 'settings.general.simpleModeDesc'
  },
  {
    id: 'notifications', section: 'general', label: 'Desktop notifications',
    help: 'Native toasts when an agent finishes or needs your input.',
    keywords: 'notifications desktop toast alert',
    i18nLabel: 'settings.general.desktopNotifications', i18nHelp: 'settings.general.desktopNotificationsDesc'
  },
  {
    id: 'autoCompact', section: 'general', label: 'Scheduled auto-compact',
    help: 'Queue /compact for every agent on a schedule. Off by default.',
    keywords: 'auto compact maintenance context overflow',
    i18nLabel: 'settings.general.autoCompact', i18nHelp: 'settings.general.autoCompactDesc'
  },
  {
    id: 'autoUpdate', section: 'general', label: 'Auto-update',
    help: 'Check GitHub releases and download updates in the background.',
    keywords: 'auto update upgrade release',
    i18nLabel: 'settings.general.autoUpdate', i18nHelp: 'settings.general.autoUpdateDesc'
  },
  {
    id: 'telemetry', section: 'general', label: 'Anonymous usage stats',
    help: 'Anonymous events only — never prompts, code, paths, or agent output.',
    keywords: 'telemetry analytics usage stats anonymous',
    i18nLabel: 'settings.general.telemetry', i18nHelp: 'settings.general.telemetryDesc'
  },
  {
    id: 'prereqGit', section: 'prerequisites', label: 'Git',
    help: 'Required to clone and commit in agent worktrees.',
    keywords: 'git cli prerequisite tool install',
    i18nLabel: 'settings.prereq.git', i18nHelp: 'settings.prereq.gitHelp'
  },
  {
    id: 'prereqNode', section: 'prerequisites', label: 'Node.js',
    help: 'Required for the gallery, hooks and some engine installers.',
    keywords: 'node npm prerequisite tool install',
    i18nLabel: 'settings.prereq.node', i18nHelp: 'settings.prereq.nodeHelp'
  },
  {
    id: 'prereqClaude', section: 'prerequisites', label: 'Claude Code',
    help: 'Recommended orchestrator engine. Installs on first run if missing.',
    keywords: 'claude code cli engine prerequisite',
    i18nLabel: 'settings.prereq.claude', i18nHelp: 'settings.prereq.claudeHelp'
  },
  {
    id: 'defaultModel', section: 'agents', label: 'Default agent model',
    help: 'Newly spawned Claude agents start on this model unless picked per-agent.',
    keywords: 'default model fable opus sonnet claude agents',
    i18nLabel: 'settings.agentsModels.defaultModel', i18nHelp: 'settings.agentsModels.defaultModelDesc'
  },
  {
    id: 'maxTurns', section: 'agents', label: 'Max turns per run',
    help: 'Blank is unlimited. Caps how long a single agent run may go.',
    keywords: 'max turns limit run loop',
    i18nLabel: 'settings.agentsModels.maxTurns', i18nHelp: 'settings.agentsModels.blankUnlimited'
  },
  {
    id: 'orchSpawn', section: 'agents', label: 'Orchestrator may spawn temps',
    help: 'When on, the orchestrator can hire short-lived workers on its own.',
    keywords: 'orchestrator spawn temps workers hire',
    i18nLabel: 'settings.agentsModels.orchSpawn', i18nHelp: 'settings.agentsModels.orchSpawnHelp'
  },
  {
    id: 'autoMode', section: 'autonomy', label: 'Autonomy',
    help: 'Autonomous agents act without asking. Ask-first pauses for tool approval.',
    keywords: 'autonomy auto mode ask first approval bypass',
    i18nLabel: 'settings.autonomy.autonomy', i18nHelp: 'settings.autonomy.autoDesc'
  },
  {
    id: 'costCapTokens', section: 'autonomy', label: 'Floor token budget',
    help: 'Total tokens across the floor. The circuit breaker steers, then constrains, then stops.',
    keywords: 'budget token cap spend cost limit floor tokens',
    i18nLabel: 'settings.autonomy.floorBudget', i18nHelp: 'settings.autonomy.budgetTotal'
  },
  {
    id: 'velocity', section: 'autonomy', label: 'Token velocity',
    help: 'Output-token ceiling per minute. Trips the breaker when an agent floods.',
    keywords: 'velocity tok/min budget rate limit breaker',
    i18nLabel: 'settings.autonomy.velocity', i18nHelp: 'settings.autonomy.breakerDesc'
  },
  {
    id: 'brkEnabled', section: 'autonomy', label: 'Circuit breaker',
    help: 'Guard against runaway agents and spend.',
    keywords: 'circuit breaker enabled guardrail',
    i18nLabel: 'settings.autonomy.breaker', i18nHelp: 'settings.autonomy.breakerDesc'
  },
  {
    id: 'brkHardStop', section: 'autonomy', label: 'Hard stop',
    help: 'When tripped, kill the agent instead of constraining it.',
    keywords: 'hard stop kill trip constrain breaker',
    i18nLabel: 'settings.autonomy.hardStop', i18nHelp: 'settings.autonomy.hardStopDesc'
  },
  {
    id: 'repeated', section: 'autonomy', label: 'Repeated-tool limit',
    help: 'How many identical tool calls in a row trip the breaker.',
    keywords: 'repeated tool limit loop breaker',
    i18nLabel: 'settings.autonomy.repeatedLimit', i18nHelp: 'settings.autonomy.breakerDesc'
  },
  {
    id: 'errorStorm', section: 'autonomy', label: 'Error-storm limit',
    help: 'How many errors in a short window trip the breaker.',
    keywords: 'error storm limit breaker',
    i18nLabel: 'settings.autonomy.errorStormLimit', i18nHelp: 'settings.autonomy.breakerDesc'
  },
  {
    id: 'agentTokenCap', section: 'autonomy', label: 'Per-agent token cap',
    help: 'Optional cap applied to each new agent. Blank inherits the floor budget.',
    keywords: 'agent token cap budget per-agent',
    i18nLabel: 'settings.autonomy.agentTokenCap', i18nHelp: 'settings.autonomy.agentTokenCapHelp'
  },
  {
    id: 'slack', section: 'connections', label: 'Slack',
    help: 'Pipe a Slack channel into the orchestrator queue.',
    keywords: 'slack bot token signing secret channel webhook',
    i18nLabel: 'settings.connections.slack', i18nHelp: 'settings.connections.slackDesc'
  },
  {
    id: 'webhooks', section: 'connections', label: 'Webhook triggers',
    help: 'One public endpoint per caller, each with its own secret and mode.',
    keywords: 'webhook trigger inbound http secret',
    i18nLabel: 'settings.connections.webhooks', i18nHelp: 'settings.connections.webhooksDesc'
  },
  {
    id: 'integrations', section: 'connections', label: 'REST integrations',
    help: 'APIs agents can call without ever seeing the key. Owned with MDF-20.',
    keywords: 'integrations rest api broker secret connections',
    i18nLabel: 'settings.connections.integrations', i18nHelp: 'settings.connections.integrationsHelp'
  },
  {
    id: 'freeflow', section: 'voice', label: 'Free Flow',
    help: 'Push-to-talk dictation via Groq Whisper into the queue composer.',
    keywords: 'voice dictation free flow whisper groq mic',
    i18nLabel: 'settings.voice.freeFlow', i18nHelp: 'settings.voice.freeFlowDesc'
  },
  {
    id: 'idleDisconnect', section: 'voice', label: 'Idle auto-disconnect',
    help: 'How long a voice session stays open with no talking.',
    keywords: 'idle disconnect realtime voice timeout',
    i18nLabel: 'settings.voice.idleDisconnect', i18nHelp: 'settings.voice.idleDisconnectDesc'
  },
  {
    id: 'semanticMemory', section: 'memory', label: 'Semantic memory',
    help: 'Index markdown memory for instant search across sessions.',
    keywords: 'semantic memory palace recall search',
    i18nLabel: 'settings.memory.semanticMemory', i18nHelp: 'settings.memory.crossSessionDesc'
  },
  {
    id: 'knowledgeGraph', section: 'memory', label: 'Knowledge Graph',
    help: 'Add docs, images and PDFs; agents query them via the kg tool.',
    keywords: 'knowledge graph kg documents files',
    i18nLabel: 'settings.memory.kgTitle', i18nHelp: 'settings.memory.kgDesc'
  }
];

export function searchSettings(query: string, extraHay?: (id: string) => string): SettingField[] {
  const t = query.trim().toLowerCase();
  if (!t) return [];
  const parts = t.split(/\s+/).filter(Boolean);
  return SETTING_FIELDS.filter((f) => {
    const extra = extraHay ? extraHay(f.id) : '';
    const hay = `${f.label} ${f.help} ${f.keywords} ${f.id} ${f.section} ${extra}`.toLowerCase();
    return parts.every((p) => hay.includes(p));
  });
}
