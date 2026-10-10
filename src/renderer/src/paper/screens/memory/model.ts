/** Memory browser (MDF-18) data layer. One `MemorySource` with two backends:
 *  live reads the hive through `window.cth` (MemPalace search, agent memory.md,
 *  the Knowledge store) and demo serves a sample floor in the browser gallery.
 *  Every view renders the same `MemoryHit[]`, so Cards, List and Graph always
 *  agree on the result set. */
import { extractTopics, type Topic } from '@/components/memoryGraph/extractTopics';
import type { PaperAgent } from '../../data/model';

export type HitSource = 'memory' | 'knowledge';
export type SourceFilter = 'all' | HitSource;
export type View = 'cards' | 'list' | 'graph';

export interface MemoryHit {
  id: string;
  source: HitSource;
  /** Agent wing for memory hits; undefined for knowledge documents. */
  agentId?: string;
  /** Short label for the file: `memory.md` or the document title. */
  file: string;
  /** Absolute path for Open file, when known. */
  path?: string;
  /** Knowledge document id (kg:get / kg:remove). */
  docId?: string;
  text: string;
  snippet: string;
  score?: number;
  /** ISO date the note was written, when the text carries one. */
  writtenAt?: string;
}

export interface PalaceStatus {
  available: boolean;
  active: boolean;
  initialized: boolean;
  model?: string;
}

export interface KnowledgeRow {
  id: string;
  title: string;
  source: string;
  modality: string;
  bytes: number;
  chunkCount: number;
  addedAt: string;
}

export interface MemorySource {
  mode: 'live' | 'demo';
  status(): Promise<PalaceStatus>;
  search(query: string): Promise<MemoryHit[]>;
  recent(agents: string[]): Promise<MemoryHit[]>;
  memories(agents: string[]): Promise<Record<string, string>>;
  docs(): Promise<KnowledgeRow[]>;
  addFiles(): Promise<number>;
  removeDoc(id: string): Promise<boolean>;
  reflect(): Promise<{ condensed: number; total: number }>;
  open(hit: MemoryHit): Promise<boolean>;
  fullText(hit: MemoryHit): Promise<string>;
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

const DATE_RE = /(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/;

export function dateIn(text: string): string | undefined {
  const m = DATE_RE.exec(text);
  if (!m) return undefined;
  const iso = m[2] ? `${m[1]}T${m[2]}:00Z` : `${m[1]}T00:00:00Z`;
  return Number.isNaN(Date.parse(iso)) ? undefined : iso;
}

export function snippetOf(text: string, max = 220): string {
  const flat = text.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Sheet / card heading: the note title, never the filename (B-18-10). */
export function titleOf(hit: MemoryHit): string {
  const heading = /^#{1,4}\s+(.+)$/m.exec(hit.text);
  if (heading) {
    const tail = heading[1].replace(/^\s*\d{4}-\d{2}-\d{2}\s*[—\-:·]*\s*/, '').trim();
    if (tail) return tail;
  }
  const bold = /\*\*(.+?)\*\*/.exec(hit.text);
  if (bold?.[1]) {
    const t = bold[1].replace(/[`*_]/g, '').trim();
    if (t) return t;
  }
  return hit.file;
}

/** Split a memory.md into `##` sections and dated log bullets: the units a
 *  person thinks of as "one memory". The seed header is dropped. */
export function sectionsOf(md: string): string[] {
  const out: string[] = [];
  for (const block of md.split(/\n(?=##\s)/)) {
    const body = block.trim();
    if (!body || /^#\s/.test(body) && !body.includes('\n')) continue;
    const bullets = body.split(/\n(?=- \d{4}-\d{2}-\d{2})/);
    if (bullets.length > 1) out.push(...bullets.slice(1).map((b) => b.trim()));
    else if (!/^#\s.*\n+_Append durable facts/.test(body)) out.push(body);
  }
  return out.filter((s) => s.replace(/^#.*$/gm, '').trim().length > 0);
}

/** Parse the MemPalace CLI `search` output into hits. The CLI prints numbered
 *  blocks (`[1] wing / room`, `Source: …`, `Match: 0.82`, then the text). Any
 *  shape we do not recognise becomes one hit, so a format change degrades to
 *  plain text instead of an empty list. */
export function parsePalaceOutput(output: string, agentIds: string[]): MemoryHit[] {
  const text = output.replace(/\r/g, '');
  const blocks = text.split(/\n\s*\[(\d+)\]\s*/).slice(1);
  const hits: MemoryHit[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const n = blocks[i];
    const lines = (blocks[i + 1] ?? '').split('\n');
    const head = lines.shift() ?? '';
    const wing = head.split(/[\/·]/)[0].trim().replace(/^wing[_:]?/, '');
    let file = 'memory.md';
    let score: number | undefined;
    const body: string[] = [];
    for (const raw of lines) {
      const l = raw.trim();
      if (/^[─━=-]{6,}$/.test(l)) continue;
      const src = /^Source:\s*(.+)$/i.exec(l);
      if (src) { file = src[1].split('/').pop() ?? src[1]; continue; }
      const sc = /^(Match|Similarity|Score|Distance):\s*([\d.]+)/i.exec(l);
      if (sc) { score = Number(sc[2]); continue; }
      body.push(raw.replace(/^\s{0,6}/, ''));
    }
    const t = body.join('\n').trim();
    if (!t) continue;
    const agentId = agentIds.find((a) => a === wing) ?? (wing || undefined);
    hits.push({ id: `m${n}:${agentId ?? ''}`, source: 'memory', agentId, file, text: t, snippet: snippetOf(t), score, writtenAt: dateIn(t) });
  }
  if (!hits.length && text.trim() && !/no results|nothing/i.test(text)) {
    const t = text.trim();
    hits.push({ id: 'm0', source: 'memory', file: 'memory.md', text: t, snippet: snippetOf(t), writtenAt: dateIn(t) });
  }
  return hits;
}

export function filterHits(hits: MemoryHit[], source: SourceFilter, agent: string | null): MemoryHit[] {
  return hits.filter((h) => (source === 'all' || h.source === source) && (!agent || h.agentId === agent));
}

/** Rank by score when present, newest first otherwise. */
export function rankHits(hits: MemoryHit[]): MemoryHit[] {
  return [...hits].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (Date.parse(b.writtenAt ?? '') || 0) - (Date.parse(a.writtenAt ?? '') || 0));
}

/** Keyword relevance for the demo backend and the live fallback over memory.md.
 *  Short glue words (len 2–3) are dropped so a query like `zzzz-no-such-memory`
 *  does not match every note that merely contains "memory". */
export function keywordScore(text: string, query: string): number {
  const raw = query.toLowerCase().split(/\W+/).filter(Boolean);
  const words = raw.filter((w) => w.length > 3);
  const terms = words.length ? words : raw.filter((w) => w.length > 2);
  if (!terms.length) return 0;
  const hay = text.toLowerCase();
  let hit = 0;
  for (const w of terms) if (hay.includes(w)) hit++;
  return hit / terms.length;
}

export const SUGGESTIONS = ['release checklist', 'electron upgrade', 'what did we decide about the sidebar', 'broker token', 'preview tips'];
export const DEBOUNCE_MS = 250;
export const RECENT_LIMIT = 18;
export const CLUSTER_HUES = [210, 28, 152, 262, 42, 188, 330, 92, 0, 240];

export function clusterHue(cluster: number): number {
  return CLUSTER_HUES[((cluster % CLUSTER_HUES.length) + CLUSTER_HUES.length) % CLUSTER_HUES.length];
}

/** Graph of the current result set so Cards, List and Graph always agree.
 *  Concatenate hit bodies as-is. Prefixing `## ${h.file}` made extractTopics
 *  treat the filename as a topic (B-18-1 / MDF-51); hitMentions then looked
 *  in the body and the first topic emptied the board. */
export function graphFromHits(agents: PaperAgent[], hits: MemoryHit[]): GraphModel {
  const memories: Record<string, string> = {};
  const seen = new Set<string>();
  let knowledge = '';
  for (const h of hits) {
    const chunk = h.text;
    if (h.agentId) {
      seen.add(h.agentId);
      memories[h.agentId] = memories[h.agentId] ? `${memories[h.agentId]}\n${chunk}` : chunk;
    } else {
      knowledge = knowledge ? `${knowledge}\n${chunk}` : chunk;
    }
  }
  const present = agents.filter((a) => seen.has(a.id));
  if (knowledge) {
    memories.knowledge = knowledge;
    present.push({ id: 'knowledge', name: 'Knowledge', status: 'idle' });
  }
  if (!present.length) return { nodes: [], edges: [], clusters: [] };
  return graphOf(present, memories);
}

export function hitMentions(hit: MemoryHit, topic: string): boolean {
  const needle = topic.toLowerCase();
  return hit.text.toLowerCase().includes(needle) || titleOf(hit).toLowerCase() === needle;
}

// ─── Graph model ───────────────────────────────────────────────────────────

export interface GNode { id: string; kind: 'agent' | 'topic'; label: string; cluster: number; weight: number; agentIds: string[] }
export interface GEdge { source: string; target: string }
export interface GraphModel { nodes: GNode[]; edges: GEdge[]; clusters: Array<{ id: number; label: string }> }

/** Agents are clusters; a topic joins the cluster of the first agent that
 *  mentions it and links to every agent that does. */
export function graphOf(agents: PaperAgent[], memories: Record<string, string>, maxTopics = 48): GraphModel {
  const ids = agents.map((a) => a.id);
  const clusterOf = new Map(ids.map((id, i) => [id, i]));
  const { topics } = extractTopics(memories, maxTopics);
  const nodes: GNode[] = agents.map((a, i) => ({ id: `agent:${a.id}`, kind: 'agent', label: a.name, cluster: i, weight: 1, agentIds: [a.id] }));
  const edges: GEdge[] = [];
  for (const t of topics as Topic[]) {
    const own = t.agentIds.filter((a) => clusterOf.has(a));
    if (!own.length) continue;
    nodes.push({ id: t.id, kind: 'topic', label: t.label, cluster: clusterOf.get(own[0]) ?? 0, weight: t.weight, agentIds: own });
    for (const a of own) edges.push({ source: `agent:${a}`, target: t.id });
  }
  return { nodes, edges, clusters: agents.map((a, i) => ({ id: i, label: a.name })) };
}

/** Synthetic graph for the 500-node performance check (demo only). */
export function stressGraph(n: number): GraphModel {
  const k = 10;
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  for (let c = 0; c < k; c++) nodes.push({ id: `agent:s${c}`, kind: 'agent', label: `Agent ${c + 1}`, cluster: c, weight: 1, agentIds: [`s${c}`] });
  for (let i = k; i < n; i++) {
    const c = i % k;
    nodes.push({ id: `topic:s${i}`, kind: 'topic', label: `topic ${i}`, cluster: c, weight: 2, agentIds: [`s${c}`] });
    edges.push({ source: `agent:s${c}`, target: `topic:s${i}` });
    if (i % 7 === 0) edges.push({ source: `agent:s${(c + 3) % k}`, target: `topic:s${i}` });
  }
  return { nodes, edges, clusters: Array.from({ length: k }, (_, i) => ({ id: i, label: `Agent ${i + 1}` })) };
}

// ─── Live backend (Electron) ───────────────────────────────────────────────

type Cth = {
  memoryStatus(): Promise<{ available: boolean; active: boolean; initialized: boolean; model: string }>;
  searchMemory(q: string, wing?: string): Promise<{ ok: boolean; output: string; error?: string }>;
  hiveMemory(id: string): Promise<string>;
  reflectNow(id?: string): Promise<Array<{ id: string; condensed: boolean }>>;
  kgSearch(q: string, limit?: number): Promise<Array<{ docId: string; title: string; source: string; chunkIdx: number; score: number; snippet: string }>>;
  kgList(): Promise<Array<KnowledgeRow & { addedAt: string }>>;
  kgGet(id: string): Promise<{ text: string } | null>;
  kgRemove(id: string): Promise<{ ok: boolean }>;
  kgAddFiles(): Promise<{ ok: boolean; results: Array<{ ok: boolean }> }>;
  revealPath(p: string): Promise<{ ok: boolean }>;
  harnessHomeSync?(): string | null;
};

function cth(): Cth | null {
  const c = (window as { cth?: Partial<Cth> }).cth;
  return c && typeof c.searchMemory === 'function' && typeof c.kgList === 'function' ? (c as Cth) : null;
}

export class PalaceUnavailable extends Error {}

function liveSource(c: Cth): MemorySource {
  const home = c.harnessHomeSync?.() ?? null;
  const memPath = (id: string): string | undefined => (home ? `${home}/hive/agents/${id}/memory.md` : undefined);
  let agentIds: string[] = [];
  return {
    mode: 'live',
    async status() {
      const s = await c.memoryStatus();
      return { available: s.available, active: s.active, initialized: s.initialized, model: s.model };
    },
    async search(query) {
      const [palace, kg] = await Promise.all([
        c.searchMemory(query),
        c.kgSearch(query, 12).catch(() => [])
      ]);
      if (!palace.ok) throw new PalaceUnavailable(palace.error ?? 'MemPalace search failed');
      const mem = parsePalaceOutput(palace.output, agentIds).map((h) => ({ ...h, path: h.agentId ? memPath(h.agentId) : undefined }));
      const docs: MemoryHit[] = kg.map((k) => ({
        id: `k:${k.docId}:${k.chunkIdx}`, source: 'knowledge', docId: k.docId, file: k.title, path: k.source,
        text: k.snippet, snippet: snippetOf(k.snippet), score: k.score
      }));
      return rankHits([...mem, ...docs]);
    },
    async recent(ids) {
      agentIds = ids;
      const all = await this.memories(ids);
      const hits: MemoryHit[] = [];
      for (const [id, md] of Object.entries(all)) {
        sectionsOf(md).slice(-3).forEach((s, i) => hits.push({
          id: `r:${id}:${i}`, source: 'memory', agentId: id, file: 'memory.md', path: memPath(id), text: s, snippet: snippetOf(s), writtenAt: dateIn(s)
        }));
      }
      return rankHits(hits).slice(0, RECENT_LIMIT);
    },
    async memories(ids) {
      agentIds = ids;
      const texts = await Promise.all(ids.map((id) => c.hiveMemory(id).catch(() => '')));
      return Object.fromEntries(ids.map((id, i) => [id, texts[i] ?? '']));
    },
    async docs() {
      return (await c.kgList()).map((d) => ({ id: d.id, title: d.title, source: d.source, modality: d.modality, bytes: d.bytes, chunkCount: d.chunkCount, addedAt: d.addedAt }));
    },
    async addFiles() {
      const r = await c.kgAddFiles();
      return r.results.filter((x) => x.ok).length;
    },
    async removeDoc(id) {
      return (await c.kgRemove(id)).ok;
    },
    async reflect() {
      const r = await c.reflectNow();
      return { condensed: r.filter((x) => x.condensed).length, total: r.length };
    },
    async open(hit) {
      return hit.path ? (await c.revealPath(hit.path)).ok : false;
    },
    async fullText(hit) {
      if (hit.source === 'knowledge' && hit.docId) return (await c.kgGet(hit.docId))?.text ?? hit.text;
      return hit.text;
    }
  };
}

// ─── Demo backend (browser gallery) ────────────────────────────────────────

const DEMO_MEMORY: Record<string, string> = {
  god: `# Memory\n\n## 2026-10-09 — Release checklist\n- **Release checklist** lives in RELEASE-CHECKLIST.md; Phyllis owns the packaging run.\n\n## 2026-10-10 — Electron upgrade\n- Fork main moved to **Electron upgrade** 44 with electron-builder 26 (MDF-42). Temps must run npm install.\n\n## 2026-10-10 — Paper shell\n- New screens register through **paper screens** glob; never edit PaperApp.tsx.`,
  'developer-mv2fn62v': `# Memory\n\n## 2026-10-10 — Paper shell\n- Shared UI lives in src/renderer/src/ui; **paper screens** export route and Screen.\n\n## 2026-10-10 — Broker token\n- **Broker token** comes from MD_BROKER_TOKEN; reread $AGENT_DIR/.broker after a restart. Never copy it.\n\n## 2026-10-09 — Electron upgrade\n- Rebuilt native modules after the **Electron upgrade**; node-pty needed @electron/rebuild 4.`,
  'tester-mv2fnyz5': `# Memory\n\n## 2026-10-10 — Preview tips\n- **Preview tips**: the sandbox blocks port binding; use --port 5183 and headless Chrome for screenshots.\n\n## 2026-10-08 — Release checklist\n- Smoke the dmg against the **release checklist** before Phyllis tags.`,
  'phyllis-mv2fq1rq': `# Memory\n\n## 2026-10-10 — Release checklist\n- Signed v0.5.5; the **release checklist** step 7 (notarize) takes ~6 minutes.\n\n## 2026-10-07 — Broker token\n- Packaged app rotates the **broker token** on every launch.`
};

const DEMO_DOCS: KnowledgeRow[] = [
  { id: 'kg-spec', title: 'SPEC.md', source: '/docs/SPEC.md', modality: 'text', bytes: 48210, chunkCount: 41, addedAt: '2026-10-08T09:12:00Z' },
  { id: 'kg-graph', title: 'MEMORY_GRAPH_SPEC.md', source: '/docs/MEMORY_GRAPH_SPEC.md', modality: 'text', bytes: 12844, chunkCount: 11, addedAt: '2026-10-09T16:40:00Z' }
];

const DEMO_DOC_TEXT: Record<string, string> = {
  'kg-spec': 'Munder Difflin is a desktop office for AI agents. The hive is a folder protocol: inbox, outbox, memory.md per agent. The release checklist gates every build.',
  'kg-graph': 'The memory graph shows agents and the topics their memory files share. Topics come from headings and bold spans mentioned by two or more agents.',
  'kg-added': 'Onboarding notes: new agents read PROTOCOL.md, then their memory.md, then the inbox. Preview tips for the gallery live in the tester memory.'
};

function demoSource(): MemorySource {
  let docs = [...DEMO_DOCS];
  const wait = <T,>(v: T, ms = 220): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));
  const memHits = (): MemoryHit[] =>
    Object.entries(DEMO_MEMORY).flatMap(([id, md]) =>
      sectionsOf(md).map((s, i) => ({
        id: `d:${id}:${i}`, source: 'memory' as const, agentId: id, file: 'memory.md', path: `hive/agents/${id}/memory.md`,
        text: s, snippet: snippetOf(s), writtenAt: dateIn(s)
      }))
    );
  const docHits = (): MemoryHit[] =>
    docs.map((d) => ({ id: `k:${d.id}`, source: 'knowledge' as const, docId: d.id, file: d.title, path: d.source, text: DEMO_DOC_TEXT[d.id] ?? '', snippet: snippetOf(DEMO_DOC_TEXT[d.id] ?? ''), writtenAt: d.addedAt }));
  return {
    mode: 'demo',
    status: () => wait({ available: true, active: true, initialized: true, model: 'minilm' }, 80),
    search(query) {
      const scored = [...memHits(), ...docHits()]
        .map((h) => ({ ...h, score: keywordScore(h.text, query) }))
        .filter((h) => (h.score ?? 0) >= 1);
      return wait(rankHits(scored));
    },
    recent: () => wait(rankHits(memHits()).slice(0, RECENT_LIMIT)),
    memories: (ids) => wait(Object.fromEntries(ids.map((id) => [id, DEMO_MEMORY[id] ?? ''])), 60),
    docs: () => wait([...docs], 120),
    addFiles() {
      if (docs.some((d) => d.id === 'kg-added')) return wait(0);
      docs = [...docs, { id: 'kg-added', title: 'onboarding-notes.md', source: '/docs/onboarding-notes.md', modality: 'text', bytes: 2210, chunkCount: 2, addedAt: new Date().toISOString() }];
      return wait(1);
    },
    removeDoc(id) {
      docs = docs.filter((d) => d.id !== id);
      return wait(true);
    },
    reflect: () => wait({ condensed: 0, total: Object.keys(DEMO_MEMORY).length }, 400),
    open: () => wait(false, 10),
    fullText: (hit) => wait(hit.source === 'knowledge' && hit.docId ? DEMO_DOC_TEXT[hit.docId] ?? hit.text : hit.text, 40)
  };
}

export const DEMO_AGENT_IDS = Object.keys(DEMO_MEMORY);

let cached: MemorySource | null = null;
export function memorySource(): MemorySource {
  if (!cached) {
    const c = cth();
    cached = c ? liveSource(c) : demoSource();
  }
  return cached;
}
