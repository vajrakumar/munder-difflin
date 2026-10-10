/** Memory browser (MDF-18): search by meaning, Cards / List / Graph of the
 *  same hits, a Knowledge tab for ingested docs, and palace status. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, FileText, Search } from 'lucide-react';
import {
  Avatar, Badge, Button, Card, EmptyState, Input, Kbd, Sheet, SheetContent, Skeleton,
  Table, TBody, TD, TH, THead, TR, ToastProvider, useToast
} from '@/ui';
import { RichText } from '../../common/RichText';
import { agentName, useFloor } from '../../data/hive';
import type { PaperAgent } from '../../data/model';
import { relative } from '../../data/time';
import type { PaperRoute } from '../../routes';
import { MemoryGraph } from './graph';
import {
  DEBOUNCE_MS, DEMO_AGENT_IDS, PalaceUnavailable, SUGGESTIONS, filterHits, graphFromHits,
  hitMentions, memorySource, type KnowledgeRow, type MemoryHit, type PalaceStatus,
  type SourceFilter, type View
} from './model';
import '../../common/common.css';
import './memory.css';

export const route: PaperRoute = 'memory';

type Tab = View | 'knowledge';

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

function nameOf(agents: PaperAgent[], id: string | undefined): string {
  if (!id) return 'Knowledge';
  if (id === 'knowledge') return 'Knowledge';
  return agentName(agents, id);
}

function HitMeta({ hit, agents }: { hit: MemoryHit; agents: PaperAgent[] }): JSX.Element {
  return (
    <>
      <Avatar name={nameOf(agents, hit.agentId)} size="sm" />
      <span className="pm-card-file">{hit.file}</span>
      <Badge tone={hit.source === 'knowledge' ? 'accent' : 'neutral'}>{hit.source}</Badge>
    </>
  );
}

function ScreenInner(): JSX.Element {
  const floor = useFloor();
  const toast = useToast();
  const src = useMemo(() => memorySource(), []);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('cards');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [agent, setAgent] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [hits, setHits] = useState<MemoryHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PalaceStatus | null>(null);
  const [docs, setDocs] = useState<KnowledgeRow[]>([]);
  const [open, setOpen] = useState<MemoryHit | null>(null);
  const [full, setFull] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  const agents = useMemo<PaperAgent[]>(
    () => (floor.agents.length ? floor.agents : DEMO_AGENT_IDS.map((id) => ({ id, name: id, status: 'idle' as const }))),
    [floor.agents]
  );
  const agentKey = agents.map((a) => a.id).join(',');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await src.status();
      setStatus(s);
      setBuilding(!s.initialized || !s.active);
    } catch {
      setStatus({ available: false, active: false, initialized: false });
    }
  }, [src]);

  const refreshDocs = useCallback(async () => {
    try { setDocs(await src.docs()); } catch { setDocs([]); }
  }, [src]);

  useEffect(() => { void refreshStatus(); void refreshDocs(); }, [refreshStatus, refreshDocs]);

  useEffect(() => {
    let alive = true;
    const q = debounced;
    setLoading(true);
    setError(null);
    const run = q
      ? src.search(q)
      : src.recent(agents.map((a) => a.id));
    run.then(
      (rows) => { if (alive) { setHits(rows); setLoading(false); } },
      (err) => {
        if (!alive) return;
        setLoading(false);
        if (err instanceof PalaceUnavailable || /palace|mempalace/i.test(String(err))) {
          setError(err instanceof Error ? err.message : 'MemPalace is unavailable');
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    );
    return () => { alive = false; };
    // agentKey is the roster identity; we only refetch when that set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, src, agentKey]);

  const filtered = useMemo(() => {
    let rows = filterHits(hits, source, agent);
    if (topic) rows = rows.filter((h) => hitMentions(h, topic));
    return rows;
  }, [hits, source, agent, topic]);

  const graph = useMemo(() => graphFromHits(agents, filtered), [agents, filtered]);

  const people = useMemo(() => {
    const ids = new Set(hits.map((h) => h.agentId).filter(Boolean) as string[]);
    return agents.filter((a) => ids.has(a.id));
  }, [hits, agents]);

  useEffect(() => {
    if (!filtered.length) return;
    if (!selectedId || !filtered.some((h) => h.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!open) { setFull(''); return; }
    let alive = true;
    void src.fullText(open).then((t) => { if (alive) setFull(t); });
    return () => { alive = false; };
  }, [open, src]);

  const view: View = tab === 'knowledge' ? 'cards' : tab;
  const reflectRef = useRef<() => void>(() => { /* assigned after onReflect */ });

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (isTyping(e.target)) return;
      if (e.key === '1') { setTab('cards'); return; }
      if (e.key === '2') { setTab('list'); return; }
      if (e.key === '3') { setTab('graph'); return; }
      if (e.key === 'r') {
        e.preventDefault();
        reflectRef.current();
        return;
      }
      if (tab === 'knowledge' || open) return;
      if (e.key !== 'j' && e.key !== 'k' && e.key !== 'Enter') return;
      if (!filtered.length) return;
      const i = Math.max(0, filtered.findIndex((h) => h.id === selectedId));
      if (e.key === 'j') {
        const next = filtered[Math.min(filtered.length - 1, (selectedId ? i : -1) + 1)];
        setSelectedId(next.id);
      } else if (e.key === 'k') {
        const next = filtered[Math.max(0, (selectedId ? i : 0) - 1)];
        setSelectedId(next.id);
      } else if (e.key === 'Enter' && selectedId) {
        const hit = filtered.find((h) => h.id === selectedId);
        if (hit) setOpen(hit);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selectedId, tab, open]);

  async function onReflect(): Promise<void> {
    try {
      const r = await src.reflect();
      toast(`Reflected ${r.condensed} of ${r.total} notes`);
      void refreshStatus();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Reflect failed');
    }
  }
  reflectRef.current = () => { void onReflect(); };

  async function onAdd(): Promise<void> {
    try {
      const n = await src.addFiles();
      toast(n ? `Added ${n} document${n === 1 ? '' : 's'}` : 'No files added');
      await refreshDocs();
      if (debounced) setHits(await src.search(debounced));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Add files failed');
    }
  }

  async function onRemove(id: string): Promise<void> {
    try {
      await src.removeDoc(id);
      toast('Removed document');
      await refreshDocs();
      if (debounced) setHits(await src.search(debounced));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Remove failed');
    }
  }

  async function onOpenFile(hit: MemoryHit): Promise<void> {
    const ok = await src.open(hit);
    if (!ok) toast(src.mode === 'demo' ? 'Gallery cannot open files' : 'Could not open file');
  }

  function retry(): void {
    setError(null);
    setDebounced((q) => q);
    void refreshStatus();
    setQuery((q) => q);
    setHits([]);
    setLoading(true);
    const q = debounced;
    const run = q ? src.search(q) : src.recent(agents.map((a) => a.id));
    void run.then(setHits, (err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setLoading(false));
  }

  const searching = query.trim().length > 0;
  const palaceLabel = !status
    ? 'Checking palace…'
    : !status.available
      ? 'MemPalace unavailable'
      : building
        ? 'Memory is building'
        : `Palace ready${status.model ? ` · ${status.model}` : ''}`;

  return (
    <div className="pc-screen pm-root">
      <header className="pm-toolbar">
        <div className="pm-toolbar-top">
          <div>
            <h1>Memory</h1>
            <p className="pm-lede">
              <span className="pc-mode" data-mode={src.mode}>
                <span className="pc-dot" />
                {src.mode === 'live' ? 'Live' : 'Demo'}
              </span>
              <span className={status && !status.available ? 'pm-status-err' : building ? 'pm-status-warn' : 'pm-status-ok'}>
                {palaceLabel}
              </span>
              <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
            </p>
          </div>
          <div className="pm-views" role="tablist" aria-label="Memory view">
            {(['cards', 'list', 'graph', 'knowledge'] as Tab[]).map((id) => (
              <Button
                key={id}
                size="sm"
                variant={tab === id ? 'primary' : 'secondary'}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {id === 'cards' ? 'Cards' : id === 'list' ? 'List' : id === 'graph' ? 'Graph' : 'Knowledge'}
              </Button>
            ))}
          </div>
        </div>
        {tab !== 'knowledge' ? (
          <div className="pm-filters">
            <div className="pm-search">
              <Search size={14} aria-hidden="true" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by meaning"
                aria-label="Search memory by meaning"
              />
            </div>
            <div className="pm-chips" role="group" aria-label="Source">
              <span className="pm-chip-label">Source</span>
              {(['all', 'memory', 'knowledge'] as SourceFilter[]).map((id) => (
                <Button
                  key={id}
                  size="sm"
                  variant={source === id ? 'primary' : 'secondary'}
                  aria-pressed={source === id}
                  onClick={() => setSource(id)}
                >
                  {id === 'all' ? 'All' : id === 'memory' ? 'Memory' : 'Knowledge'}
                </Button>
              ))}
            </div>
            <div className="pm-chips" role="group" aria-label="Agent">
              <span className="pm-chip-label">Agent</span>
              <Button size="sm" variant={!agent ? 'primary' : 'secondary'} aria-pressed={!agent} onClick={() => { setAgent(null); setTopic(null); }}>
                All
              </Button>
              {people.map((a) => (
                <Button
                  key={a.id}
                  size="sm"
                  variant={agent === a.id ? 'primary' : 'secondary'}
                  aria-pressed={agent === a.id}
                  onClick={() => { setAgent(a.id); setTopic(null); }}
                >
                  {a.name}
                </Button>
              ))}
            </div>
            {topic ? (
              <Button size="sm" variant="secondary" onClick={() => setTopic(null)}>
                Topic: {topic} ×
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="pm-body">
        {tab === 'knowledge' ? (
          <div className="pm-docs">
            <div className="pm-docs-head">
              <div>
                <h2>Knowledge</h2>
                <p className="pm-docs-meta">{docs.length} document{docs.length === 1 ? '' : 's'} · searchable without a restart</p>
              </div>
              <Button onClick={() => void onAdd()}>Add files</Button>
            </div>
            {docs.length === 0 ? (
              <EmptyState
                icon={<FileText size={28} />}
                title="No documents yet"
                description="Add files to make them searchable by meaning."
                action={<Button onClick={() => void onAdd()}>Add files</Button>}
              />
            ) : (
              <div className="pm-table-wrap">
                <Table className="pm-table">
                  <THead>
                    <TR>
                      <TH>Title</TH>
                      <TH>Source</TH>
                      <TH>Chunks</TH>
                      <TH>Added</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {docs.map((d) => (
                      <TR key={d.id}>
                        <TD>{d.title}</TD>
                        <TD className="pc-key">{d.source}</TD>
                        <TD>{d.chunkCount}</TD>
                        <TD>{relative(d.addedAt) || d.addedAt.slice(0, 10)}</TD>
                        <TD>
                          <Button size="sm" variant="danger" onClick={() => void onRemove(d.id)}>Remove</Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        ) : error ? (
          <EmptyState
            icon={<Brain size={28} />}
            title="MemPalace is unavailable"
            description={error}
            action={<Button onClick={retry}>Retry</Button>}
          />
        ) : loading ? (
          <div className="pm-skel-grid" aria-busy="true" aria-label="Loading memories">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="pm-skel-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Brain size={28} />}
            title={searching ? 'No results' : 'No memories yet'}
            description={searching ? 'Try one of these queries.' : building ? 'Memory is building. Recent notes will land here.' : 'Search by meaning, or wait for agents to write notes.'}
            action={searching ? (
              <div className="pm-suggest">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="secondary" onClick={() => setQuery(s)}>{s}</Button>
                ))}
              </div>
            ) : undefined}
          />
        ) : view === 'cards' ? (
          <div className="pm-cards">
            {filtered.map((hit) => (
              <Card
                key={hit.id}
                className="pm-card"
                role="button"
                tabIndex={0}
                aria-current={hit.id === selectedId}
                onClick={() => { setSelectedId(hit.id); setOpen(hit); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(hit.id); setOpen(hit); }
                }}
              >
                <p className="pm-card-snip">{hit.snippet}</p>
                <div className="pm-card-meta">
                  <HitMeta hit={hit} agents={agents} />
                  <span className="pm-card-ago">{relative(hit.writtenAt) || '—'}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : view === 'list' ? (
          <div className="pm-table-wrap">
            <Table className="pm-table">
              <THead>
                <TR>
                  <TH>Agent</TH>
                  <TH>Snippet</TH>
                  <TH>File</TH>
                  <TH>Source</TH>
                  <TH>When</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((hit) => (
                  <TR
                    key={hit.id}
                    aria-current={hit.id === selectedId}
                    onClick={() => { setSelectedId(hit.id); setOpen(hit); }}
                  >
                    <TD>
                      <span className="pm-owner">
                        <Avatar name={nameOf(agents, hit.agentId)} size="sm" />
                        <span className="pm-owner-name">{nameOf(agents, hit.agentId)}</span>
                      </span>
                    </TD>
                    <TD>{hit.snippet}</TD>
                    <TD className="pc-key">{hit.file}</TD>
                    <TD><Badge tone={hit.source === 'knowledge' ? 'accent' : 'neutral'}>{hit.source}</Badge></TD>
                    <TD>{relative(hit.writtenAt) || '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : (
          <MemoryGraph
            model={graph}
            highlightAgent={agent}
            onPick={(node) => {
              if (node.kind === 'agent') {
                const id = node.agentIds[0];
                setAgent(id === 'knowledge' ? null : id);
                setSource(id === 'knowledge' ? 'knowledge' : 'all');
                setTopic(null);
              } else {
                setTopic(node.label);
              }
            }}
          />
        )}
      </div>

      <footer className="pm-foot">
        <span className={status && !status.available ? 'pm-status-err' : building ? 'pm-status-warn' : 'pm-status-ok'}>
          {palaceLabel}
        </span>
        <Button size="sm" variant="secondary" onClick={() => void onReflect()}>Reflect now</Button>
        <div className="pm-foot-keys">
          <Kbd>/</Kbd> search
          <Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd> views
          <Kbd>j</Kbd><Kbd>k</Kbd> move
          <Kbd>↵</Kbd> open
          <Kbd>r</Kbd> reflect
        </div>
      </footer>

      <Sheet open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        {open ? (
          <SheetContent title={open.file}>
            <div className="pm-sheet-body">
              <div className="pm-sheet-meta">
                <Avatar name={nameOf(agents, open.agentId)} size="sm" />
                <span>{nameOf(agents, open.agentId)}</span>
                <Badge tone={open.source === 'knowledge' ? 'accent' : 'neutral'}>{open.source}</Badge>
                <span>{relative(open.writtenAt) || ''}</span>
              </div>
              <div className="pm-sheet-text"><RichText text={(full || open.text).replace(/^#+\s*/gm, '')} /></div>
              <Button variant="secondary" onClick={() => void onOpenFile(open)}>Open file</Button>
            </div>
          </SheetContent>
        ) : null}
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
