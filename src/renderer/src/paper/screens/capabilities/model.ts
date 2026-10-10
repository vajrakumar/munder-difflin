/** Capabilities (MDF-19): marketplace catalog, installed set, who-has-what
 *  grants and role bundles. Gallery persists in localStorage. Live Electron
 *  reuses skills:* IPC and mcpCatalog when the bridge is present — no new IPC. */
import { MCP_CATALOG, type McpTier } from '@shared/mcpCatalog';
import type { PaperAgent } from '../../data/model';

export type CapKind = 'skill' | 'mcp';
export type SkillProvider = 'claude' | 'opencode' | 'codex';
export type TabId = 'marketplace' | 'installed' | 'matrix';
export const TABS: TabId[] = ['marketplace', 'installed', 'matrix'];

export type TypeFilter = 'all' | CapKind;
export type RiskFilter = 'all' | McpTier;

export interface Capability {
  id: string;
  kind: CapKind;
  slug: string;
  name: string;
  description: string;
  provider?: SkillProvider;
  scope?: 'user' | 'project' | 'bundled';
  owner?: string;
  category?: string;
  url?: string;
  path?: string;
  risk?: McpTier;
  defaultEnabled?: boolean;
}

export interface CapabilityBundle {
  id: string;
  name: string;
  skills: string[];
  mcp: string[];
}

export interface CapsStore {
  installed: string[];
  mcpEnabled: Record<string, boolean>;
  grants: Record<string, string[]>;
  bundles: CapabilityBundle[];
}

export interface GrantDiff {
  agentId: string;
  agentName: string;
  added: Capability[];
  removed: Capability[];
  needsRestart: boolean;
}

export const STORAGE_KEY = 'paper.caps.v1';

export const TYPE_FILTERS: TypeFilter[] = ['all', 'skill', 'mcp'];
export const RISK_FILTERS: RiskFilter[] = ['all', 'safe-readonly', 'write', 'secret'];

type SkillSeed = {
  slug: string;
  name: string;
  description: string;
  provider: SkillProvider;
  category: string;
  owner?: string;
  inCatalogOnly?: boolean;
};

const SKILL_SEEDS: SkillSeed[] = [
  { slug: 'docx', name: 'Word documents', description: 'Create and edit .docx files with tracked changes.', provider: 'claude', category: 'Office' },
  { slug: 'pdf', name: 'PDF files', description: 'Read, fill and assemble PDFs.', provider: 'claude', category: 'Office' },
  { slug: 'pptx', name: 'PowerPoint', description: 'Build slide decks from an outline.', provider: 'claude', category: 'Office' },
  { slug: 'xlsx', name: 'Spreadsheets', description: 'Read and write workbooks, charts and formulas.', provider: 'claude', category: 'Office' },
  { slug: 'frontend-design', name: 'Frontend design', description: 'UI layout, tokens and component structure.', provider: 'claude', category: 'Design' },
  { slug: 'canvas-design', name: 'Canvas design', description: 'Poster and social layouts on a 2D canvas.', provider: 'claude', category: 'Design' },
  { slug: 'mcp-builder', name: 'MCP builder', description: 'Scaffold a Model Context Protocol server.', provider: 'claude', category: 'Tools' },
  { slug: 'webapp-testing', name: 'Web app testing', description: 'Plan and run browser checks against a running app.', provider: 'claude', category: 'Quality' },
  { slug: 'skill-creator', name: 'Skill creator', description: 'Draft a SKILL.md that other agents can install.', provider: 'claude', category: 'Tools' },
  { slug: 'brand-guidelines', name: 'Brand guidelines', description: 'Keep copy and colour on-brand.', provider: 'claude', category: 'Design' },
  { slug: 'internal-comms', name: 'Internal comms', description: 'Staff notes, memos and status updates.', provider: 'claude', category: 'Writing' },
  { slug: 'theme-factory', name: 'Theme factory', description: 'Generate light, dark and high-contrast themes.', provider: 'claude', category: 'Design' },
  { slug: 'doc-coauthoring', name: 'Doc coauthoring', description: 'Pair on a long document with comments.', provider: 'claude', category: 'Writing' },
  { slug: 'changelog', name: 'Changelog', description: 'Turn commits into a human changelog.', provider: 'claude', category: 'Writing' },
  { slug: 'release-notes', name: 'Release notes', description: 'Customer-facing notes for a version bump.', provider: 'claude', category: 'Writing' },
  { slug: 'jira-triage', name: 'Jira triage', description: 'Sort a queue by severity and owner.', provider: 'opencode', category: 'Ops' },
  { slug: 'sql-explain', name: 'SQL explain', description: 'Read a query plan and suggest indexes.', provider: 'opencode', category: 'Data' },
  { slug: 'git-history', name: 'Git history', description: 'Summarise log, blame and bisect output.', provider: 'claude', category: 'Code' },
  { slug: 'code-review', name: 'Code review', description: 'Review a diff for bugs, tests and style.', provider: 'claude', category: 'Code' },
  { slug: 'test-plan', name: 'Test plans', description: 'Acceptance cases from a spec.', provider: 'claude', category: 'Quality' },
  { slug: 'bug-repro', name: 'Bug reproduction', description: 'Turn a report into a minimal repro.', provider: 'claude', category: 'Quality' },
  { slug: 'api-docs', name: 'API docs', description: 'OpenAPI-backed reference pages.', provider: 'claude', category: 'Writing' },
  { slug: 'adr-writer', name: 'Architecture decisions', description: 'Write an ADR from a thread of options.', provider: 'claude', category: 'Writing' },
  { slug: 'meeting-notes', name: 'Meeting notes', description: 'Actions and decisions from a transcript.', provider: 'claude', category: 'Writing' },
  { slug: 'research-brief', name: 'Research briefs', description: 'Short brief with sources and open questions.', provider: 'claude', category: 'Research' },
  { slug: 'competitor-scan', name: 'Competitor scan', description: 'Compare public product pages.', provider: 'opencode', category: 'Research' },
  { slug: 'seo-audit', name: 'SEO audit', description: 'Titles, headings and crawl issues.', provider: 'opencode', category: 'Research' },
  { slug: 'a11y-audit', name: 'Accessibility audit', description: 'Keyboard, names and contrast on a page.', provider: 'claude', category: 'Quality' },
  { slug: 'perf-budget', name: 'Performance budget', description: 'Bundle size and Core Web Vitals budget.', provider: 'claude', category: 'Quality' },
  { slug: 'i18n-extract', name: 'i18n extract', description: 'Lift copy into locale keys.', provider: 'claude', category: 'Code' },
  { slug: 'css-tokens', name: 'Design tokens', description: 'OKLCH tokens from a mock.', provider: 'claude', category: 'Design' },
  { slug: 'playwright', name: 'Playwright tests', description: 'Generate and repair browser tests.', provider: 'claude', category: 'Quality' },
  { slug: 'screenshot-diff', name: 'Screenshot diff', description: 'Call out visual regressions.', provider: 'claude', category: 'Quality' },
  { slug: 'log-triage', name: 'Log triage', description: 'Cluster errors from a log dump.', provider: 'opencode', category: 'Ops' },
  { slug: 'incident-writeup', name: 'Incident writeup', description: 'Timeline, impact and follow-ups.', provider: 'claude', category: 'Ops' },
  { slug: 'rfc-draft', name: 'RFC draft', description: 'A design RFC with alternatives.', provider: 'claude', category: 'Writing' },
  { slug: 'prompt-eval', name: 'Prompt eval', description: 'Score prompt variants against cases.', provider: 'claude', category: 'Tools' },
  { slug: 'schema-migrate', name: 'Schema migrate', description: 'Plan a backwards-compatible migration.', provider: 'opencode', category: 'Data' },
  { slug: 'docker-debug', name: 'Docker debug', description: 'Read a failing container log.', provider: 'opencode', category: 'Ops' },
  { slug: 'k8s-explain', name: 'Kubernetes explain', description: 'Translate a pod event into English.', provider: 'opencode', category: 'Ops' },
  { slug: 'slack-summary', name: 'Slack summary', description: 'Digest a channel into decisions.', provider: 'claude', category: 'Writing' },
  { slug: 'email-draft', name: 'Email draft', description: 'A short mail in the house voice.', provider: 'claude', category: 'Writing' },
  { slug: 'blog-outline', name: 'Blog outline', description: 'Headings and claims for a post.', provider: 'claude', category: 'Writing' },
  { slug: 'tweet-thread', name: 'Post thread', description: 'A tight thread from a changelog.', provider: 'claude', category: 'Writing' },
  { slug: 'diagram-mermaid', name: 'Mermaid diagrams', description: 'Flow and sequence diagrams from prose.', provider: 'claude', category: 'Design' },
  { slug: 'regex-lab', name: 'Regex lab', description: 'Write and explain a regular expression.', provider: 'codex', category: 'Code' },
  { slug: 'json-fix', name: 'JSON fix', description: 'Repair and pretty-print JSON.', provider: 'codex', category: 'Code' },
  { slug: 'csv-clean', name: 'CSV clean', description: 'Normalise columns and types.', provider: 'codex', category: 'Data' },
  { slug: 'yaml-lint', name: 'YAML lint', description: 'Catch indent and merge errors.', provider: 'codex', category: 'Code' },
  { slug: 'md-table', name: 'Markdown tables', description: 'Keep wide tables aligned.', provider: 'claude', category: 'Writing' },
  { slug: 'computer-use', name: 'Computer use', description: 'Drive a desktop with screenshots.', provider: 'claude', category: 'Tools', owner: 'anthropics', inCatalogOnly: true },
  { slug: 'stripe-best-practices', name: 'Stripe best practices', description: 'Payments API patterns from Stripe.', provider: 'claude', category: 'Tools', owner: 'stripe', inCatalogOnly: true },
  { slug: 'postgres-best-practices', name: 'Postgres best practices', description: 'Schema and query guidance from Supabase.', provider: 'claude', category: 'Data', owner: 'supabase', inCatalogOnly: true },
  { slug: 'react-best-practices', name: 'React best practices', description: 'Vercel’s React and Next.js notes.', provider: 'claude', category: 'Code', owner: 'vercel', inCatalogOnly: true },
  { slug: 'cloudflare-workers', name: 'Cloudflare Workers', description: 'Edge worker patterns.', provider: 'claude', category: 'Ops', owner: 'cloudflare', inCatalogOnly: true },
  { slug: 'prisma-schema', name: 'Prisma schema', description: 'Model and migrate with Prisma.', provider: 'opencode', category: 'Data', owner: 'prisma', inCatalogOnly: true },
  { slug: 'linear-issues', name: 'Linear issues', description: 'File and triage Linear tickets.', provider: 'claude', category: 'Ops', owner: 'linear', inCatalogOnly: true },
  { slug: 'notion-pages', name: 'Notion pages', description: 'Read and write Notion docs.', provider: 'claude', category: 'Writing', owner: 'notion', inCatalogOnly: true }
];

export function skillId(slug: string): string {
  return `skill:${slug}`;
}

export function mcpId(slug: string): string {
  return `mcp:${slug}`;
}

export function isSkillId(id: string): boolean {
  return id.startsWith('skill:');
}

export function isRisky(cap: Capability): boolean {
  return cap.kind === 'mcp' && cap.risk !== 'safe-readonly';
}

export function riskTone(tier: McpTier | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (tier === 'safe-readonly') return 'success';
  if (tier === 'write') return 'warning';
  if (tier === 'secret') return 'danger';
  return 'neutral';
}

function skillFromSeed(s: SkillSeed): Capability {
  return {
    id: skillId(s.slug),
    kind: 'skill',
    slug: s.slug,
    name: s.name,
    description: s.description,
    provider: s.provider,
    scope: 'user',
    owner: s.owner ?? s.provider,
    category: s.category,
    url: `https://github.com/${s.owner ?? 'anthropics'}/skills/tree/main/${s.slug}`,
    path: `~/.claude/skills/${s.slug}`
  };
}

export function catalogSkills(): Capability[] {
  return SKILL_SEEDS.map(skillFromSeed);
}

export function mcpCapabilities(): Capability[] {
  return MCP_CATALOG.map((e) => ({
    id: mcpId(e.id),
    kind: 'mcp' as const,
    slug: e.id,
    name: e.label,
    description: e.description,
    risk: e.tier,
    defaultEnabled: e.defaultEnabled,
    category: 'MCP',
    owner: 'munder-difflin'
  }));
}

export function allCapabilities(): Capability[] {
  return [...catalogSkills(), ...mcpCapabilities()];
}

export function capIndex(caps: Capability[]): Map<string, Capability> {
  return new Map(caps.map((c) => [c.id, c]));
}

export function defaultMcpEnabled(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const e of MCP_CATALOG) out[e.id] = e.defaultEnabled;
  return out;
}

export function presetBundles(): CapabilityBundle[] {
  const s = (...slugs: string[]) => slugs.map(skillId);
  const m = (...slugs: string[]) => slugs.map(mcpId);
  return [
    {
      id: 'developer',
      name: 'Developer',
      skills: s('code-review', 'git-history', 'frontend-design', 'css-tokens', 'mcp-builder', 'i18n-extract', 'regex-lab', 'json-fix', 'yaml-lint', 'adr-writer'),
      mcp: m('filesystem', 'git', 'sequential-thinking', 'context7')
    },
    {
      id: 'researcher',
      name: 'Researcher',
      skills: s('research-brief', 'competitor-scan', 'seo-audit', 'meeting-notes', 'slack-summary', 'doc-coauthoring'),
      mcp: m('fetch', 'time', 'context7', 'sequential-thinking')
    },
    {
      id: 'tester',
      name: 'Tester',
      skills: s('webapp-testing', 'test-plan', 'bug-repro', 'playwright', 'screenshot-diff', 'a11y-audit', 'perf-budget'),
      mcp: m('filesystem', 'git', 'fetch')
    },
    {
      id: 'writer',
      name: 'Writer',
      skills: s('docx', 'pdf', 'pptx', 'changelog', 'release-notes', 'blog-outline', 'email-draft', 'internal-comms', 'md-table'),
      mcp: m('time', 'fetch')
    }
  ];
}

function seedInstalled(): string[] {
  return SKILL_SEEDS.filter((s) => !s.inCatalogOnly).map((s) => skillId(s.slug));
}

function seedGrants(agents: PaperAgent[], installed: string[], mcpEnabled: Record<string, boolean>): Record<string, string[]> {
  const safeMcp = mcpCapabilities().filter((c) => c.risk === 'safe-readonly' && mcpEnabled[c.slug]).map((c) => c.id);
  const byHint: Record<string, string[]> = {
    developer: presetBundles()[0].skills,
    tester: presetBundles()[2].skills,
    researcher: presetBundles()[1].skills,
    writer: presetBundles()[3].skills,
    phyllis: [skillId('release-notes'), skillId('changelog'), skillId('docx')],
    kelly: [skillId('webapp-testing'), skillId('frontend-design'), skillId('bug-repro')],
    dwight: [skillId('research-brief'), skillId('rfc-draft'), skillId('meeting-notes')],
    michael: [skillId('internal-comms'), skillId('meeting-notes')],
    god: [skillId('internal-comms'), skillId('meeting-notes')]
  };
  const out: Record<string, string[]> = {};
  for (const a of agents) {
    const key = (a.role ?? a.name ?? a.id).toLowerCase();
    const hit = Object.keys(byHint).find((k) => key.includes(k) || a.id.toLowerCase().includes(k) || a.name.toLowerCase().includes(k));
    const extra = hit ? byHint[hit].filter((id) => installed.includes(id)) : [];
    out[a.id] = unique([...safeMcp, ...extra]);
  }
  return out;
}

export function emptyStore(): CapsStore {
  return { installed: [], mcpEnabled: defaultMcpEnabled(), grants: {}, bundles: presetBundles() };
}

export function seedStore(agents: PaperAgent[]): CapsStore {
  const installed = seedInstalled();
  const mcpEnabled = defaultMcpEnabled();
  return {
    installed,
    mcpEnabled,
    grants: seedGrants(agents, installed, mcpEnabled),
    bundles: presetBundles()
  };
}

export function readStore(): CapsStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CapsStore>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      installed: Array.isArray(parsed.installed) ? parsed.installed.filter((x) => typeof x === 'string') : seedInstalled(),
      mcpEnabled: parsed.mcpEnabled && typeof parsed.mcpEnabled === 'object' ? { ...defaultMcpEnabled(), ...parsed.mcpEnabled } : defaultMcpEnabled(),
      grants: parsed.grants && typeof parsed.grants === 'object' ? parsed.grants : {},
      bundles: Array.isArray(parsed.bundles) && parsed.bundles.length ? parsed.bundles : presetBundles()
    };
  } catch {
    return null;
  }
}

export function writeStore(store: CapsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* private mode */ }
}

export function loadStore(agents: PaperAgent[]): CapsStore {
  const existing = readStore();
  if (!existing) {
    const seeded = seedStore(agents);
    writeStore(seeded);
    return seeded;
  }
  const next = { ...existing };
  let dirty = false;
  for (const a of agents) {
    if (!next.grants[a.id]) {
      next.grants[a.id] = seedGrants([a], next.installed, next.mcpEnabled)[a.id] ?? [];
      dirty = true;
    }
  }
  if (dirty) writeStore(next);
  return next;
}

export function cloneStore(store: CapsStore): CapsStore {
  return {
    installed: [...store.installed],
    mcpEnabled: { ...store.mcpEnabled },
    grants: Object.fromEntries(Object.entries(store.grants).map(([k, v]) => [k, [...v]])),
    bundles: store.bundles.map((b) => ({ ...b, skills: [...b.skills], mcp: [...b.mcp] }))
  };
}

export function cloneGrants(grants: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(grants).map(([k, v]) => [k, [...v]]));
}

export function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function hasGrant(grants: Record<string, string[]>, agentId: string, capId: string): boolean {
  return (grants[agentId] ?? []).includes(capId);
}

export function setGrant(
  grants: Record<string, string[]>,
  agentId: string,
  capId: string,
  on: boolean
): Record<string, string[]> {
  const cur = new Set(grants[agentId] ?? []);
  if (on) cur.add(capId);
  else cur.delete(capId);
  return { ...grants, [agentId]: [...cur] };
}

export function giveToAll(
  grants: Record<string, string[]>,
  agentIds: string[],
  capId: string,
  on: boolean
): Record<string, string[]> {
  let next = grants;
  for (const id of agentIds) next = setGrant(next, id, capId, on);
  return next;
}

export function bundleCapIds(bundle: CapabilityBundle): string[] {
  return unique([...bundle.skills, ...bundle.mcp]);
}

export function applyBundle(
  grants: Record<string, string[]>,
  agentId: string,
  bundle: CapabilityBundle
): Record<string, string[]> {
  return { ...grants, [agentId]: bundleCapIds(bundle) };
}

export function applyBundleToMany(
  grants: Record<string, string[]>,
  agentIds: string[],
  bundle: CapabilityBundle
): Record<string, string[]> {
  let next = grants;
  for (const id of agentIds) next = applyBundle(next, id, bundle);
  return next;
}

export function sameGrants(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  const keys = unique([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const as = [...(a[k] ?? [])].sort().join('\0');
    const bs = [...(b[k] ?? [])].sort().join('\0');
    if (as !== bs) return false;
  }
  return true;
}

export function diffGrants(
  applied: Record<string, string[]>,
  draft: Record<string, string[]>,
  agents: PaperAgent[],
  byId: Map<string, Capability>
): GrantDiff[] {
  const out: GrantDiff[] = [];
  for (const agent of agents) {
    const before = new Set(applied[agent.id] ?? []);
    const after = new Set(draft[agent.id] ?? []);
    const added: Capability[] = [];
    const removed: Capability[] = [];
    for (const id of after) {
      if (!before.has(id)) {
        const cap = byId.get(id);
        if (cap) added.push(cap);
      }
    }
    for (const id of before) {
      if (!after.has(id)) {
        const cap = byId.get(id);
        if (cap) removed.push(cap);
      }
    }
    if (added.length || removed.length) {
      out.push({
        agentId: agent.id,
        agentName: agent.name,
        added,
        removed,
        needsRestart: true
      });
    }
  }
  return out;
}

export function matchesQuery(cap: Capability, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [cap.name, cap.description, cap.slug, cap.owner, cap.category, cap.provider, cap.kind]
    .filter(Boolean)
    .some((s) => String(s).toLowerCase().includes(q));
}

export function filterMarketplace(
  items: Capability[],
  query: string,
  type: TypeFilter,
  risk: RiskFilter
): Capability[] {
  return items.filter((c) => {
    if (type !== 'all' && c.kind !== type) return false;
    if (risk !== 'all') {
      if (c.kind !== 'mcp') return false;
      if (c.risk !== risk) return false;
    }
    return matchesQuery(c, query);
  });
}

export function marketplaceItems(store: CapsStore, caps: Capability[], catalogOffline: boolean): Capability[] {
  if (catalogOffline) {
    return caps.filter((c) =>
      c.kind === 'skill' ? store.installed.includes(c.id) : store.mcpEnabled[c.slug]
    );
  }
  return caps;
}

export function installedItems(store: CapsStore, caps: Capability[]): Capability[] {
  return caps.filter((c) =>
    c.kind === 'skill' ? store.installed.includes(c.id) : store.mcpEnabled[c.slug] || c.defaultEnabled
  ).filter((c) => (c.kind === 'mcp' ? store.mcpEnabled[c.slug] : true));
}

export function matrixColumns(store: CapsStore, caps: Capability[]): Capability[] {
  const skills = caps.filter((c) => c.kind === 'skill' && store.installed.includes(c.id));
  const mcp = caps.filter((c) => c.kind === 'mcp');
  return [...skills, ...mcp];
}

export function usedBy(
  grants: Record<string, string[]>,
  capId: string,
  agents: PaperAgent[]
): PaperAgent[] {
  return agents.filter((a) => hasGrant(grants, a.id, capId));
}

/** Live or gallery roster only. Never pad invented seats. */
export function matrixAgents(agents: PaperAgent[]): PaperAgent[] {
  return agents.filter((a) => !a.archived);
}

export function installSkill(store: CapsStore, cap: Capability): CapsStore {
  if (cap.kind !== 'skill') return store;
  if (store.installed.includes(cap.id)) return store;
  return { ...store, installed: [...store.installed, cap.id] };
}

export function uninstallCap(store: CapsStore, cap: Capability): CapsStore {
  const grants: Record<string, string[]> = {};
  for (const [id, list] of Object.entries(store.grants)) {
    grants[id] = list.filter((x) => x !== cap.id);
  }
  if (cap.kind === 'skill') {
    return { ...store, installed: store.installed.filter((id) => id !== cap.id), grants };
  }
  return { ...store, mcpEnabled: { ...store.mcpEnabled, [cap.slug]: false }, grants };
}

export function setMcpEnabled(store: CapsStore, cap: Capability, on: boolean): CapsStore {
  if (cap.kind !== 'mcp') return store;
  return { ...store, mcpEnabled: { ...store.mcpEnabled, [cap.slug]: on } };
}

export function saveBundle(
  store: CapsStore,
  name: string,
  agentId: string,
  grants: Record<string, string[]>
): CapsStore {
  const ids = grants[agentId] ?? [];
  const bundle: CapabilityBundle = {
    id: `bundle-${Date.now().toString(36)}`,
    name: name.trim() || 'Untitled bundle',
    skills: ids.filter(isSkillId),
    mcp: ids.filter((id) => !isSkillId(id))
  };
  return { ...store, bundles: [...store.bundles, bundle] };
}

export function grantsEqualBundle(grants: string[], bundle: CapabilityBundle): boolean {
  const want = [...bundleCapIds(bundle)].sort().join('\0');
  const have = [...unique(grants)].sort().join('\0');
  return want === have;
}

type SkillsBridge = {
  skillsLocal?: (cwd?: string) => Promise<Array<{
    id: string; name: string; description: string;
    provider: SkillProvider; scope: 'user' | 'project' | 'bundled'; path: string;
  }>>;
  skillsCatalog?: (force?: boolean) => Promise<{
    skills: Array<{ name: string; description: string; url: string; category: string; owner: string }>;
    stale?: boolean;
    error?: string;
  }>;
  skillsInstall?: (url: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  skillsUninstall?: (path: string) => Promise<{ ok: boolean; error?: string }>;
  skillsReveal?: (path: string) => Promise<unknown>;
};

export function skillsBridge(): SkillsBridge | undefined {
  try {
    const c = (window as unknown as { cth?: SkillsBridge }).cth;
    return c && typeof c.skillsLocal === 'function' ? c : undefined;
  } catch {
    return undefined;
  }
}

export function mergeLiveSkills(
  store: CapsStore,
  local: Array<{ id: string; name: string; description: string; provider: SkillProvider; scope: 'user' | 'project' | 'bundled'; path: string }>,
  catalog: Array<{ name: string; description: string; url: string; category: string; owner: string }>
): { store: CapsStore; caps: Capability[] } {
  const liveSkills: Capability[] = local.map((s) => ({
    id: skillId(s.id || s.name),
    kind: 'skill',
    slug: s.id || s.name,
    name: s.name,
    description: s.description,
    provider: s.provider,
    scope: s.scope,
    path: s.path,
    owner: s.provider,
    category: 'Installed'
  }));
  const liveCatalog: Capability[] = catalog.map((s) => ({
    id: skillId(s.name),
    kind: 'skill',
    slug: s.name,
    name: s.name,
    description: s.description,
    url: s.url,
    owner: s.owner,
    category: s.category,
    provider: 'claude',
    scope: 'user'
  }));
  const byId = new Map<string, Capability>();
  for (const c of [...catalogSkills(), ...liveCatalog, ...liveSkills, ...mcpCapabilities()]) byId.set(c.id, c);
  const caps = [...byId.values()];
  const installed = unique([...store.installed, ...liveSkills.map((s) => s.id)]);
  return { store: { ...store, installed }, caps };
}
