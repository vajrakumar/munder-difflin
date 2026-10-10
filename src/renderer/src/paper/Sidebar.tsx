import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  CircleDot,
  GripVertical,
  Home,
  Inbox,
  ListTodo,
  MoreHorizontal,
  Plus,
  Puzzle,
  StickyNote,
  Timer,
  Brain,
  Users
} from 'lucide-react';
import {
  Avatar, Badge, HoverCard, IconButton, Input,
  Menu, MenuCheckboxItem, MenuContent, MenuTrigger,
  StatusRing, Tooltip
} from '@/ui';
import type { PaperAgent, PaperNote, PaperProject } from './demoData';
import { AgentOverflowMenu } from './AgentLifecycle';
import { useFloor } from './data/hive';
import { NAV, hrefFor, type PaperRoute } from './routes';
import { copyFor, currentLang } from './screens/archived/copy';

/** Header-only notes floor so 4 agent rows stay visible at 1024×640. */
const NOTES_HEAD = 40;
/** Spec: notes start at ~3 rows (search + 3 titles). */
const NOTES_DEFAULT = 132;
/** 4×40px rows + Agents label + two project headers + padding. */
const AGENTS_MIN = 248;

const ICONS: Record<string, typeof Home> = {
  home: Home,
  inbox: Inbox,
  tasks: ListTodo,
  automations: Timer,
  memory: Brain,
  capabilities: Puzzle,
  temps: Users,
  stapler: CircleDot,
  notes: StickyNote
};

function AgentCard({ agent }: { agent: PaperAgent }): JSX.Element {
  return (
    <div className="paper-agent-card">
      <div className="paper-agent-card-head">
        <StatusRing status={agent.status}>
          <Avatar name={agent.name} size="md" />
        </StatusRing>
        <div className="paper-agent-copy">
          <div className="paper-agent-name">{agent.name}</div>
          <div className="paper-agent-live">
            {agent.role} · {agent.status}
          </div>
        </div>
      </div>
      <p className="paper-agent-card-line">{agent.line}</p>
      {agent.tool ? (
        <div className="paper-agent-card-meta">
          Tool <span>{agent.tool}</span>
        </div>
      ) : null}
      {agent.ticket ? (
        <div className="paper-agent-card-ticket">
          <Badge tone="accent">{agent.ticket.key}</Badge>
          <span>{agent.ticket.title}</span>
        </div>
      ) : (
        <div className="paper-agent-card-meta">No open ticket</div>
      )}
      {agent.askedYou ? <Badge tone="danger">Asked you</Badge> : null}
      {agent.costToday ? (
        <div className="paper-agent-card-meta">Today {agent.costToday}</div>
      ) : null}
    </div>
  );
}

function AgentRow({
  agent,
  current,
  collapsed,
  dragging,
  onNudge,
  onDropAgent
}: {
  agent: PaperAgent;
  current: boolean;
  collapsed: boolean;
  dragging: boolean;
  onNudge: (id: string, dir: -1 | 1) => void;
  onDropAgent: (fromId: string, target: PaperAgent) => void;
}): JSX.Element {
  const row = (
    <a
      className="paper-agent-row"
      href={hrefFor('agent', agent.id)}
      aria-current={current ? 'page' : undefined}
      draggable
      data-dragging={dragging ? 'true' : undefined}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/agent-id', agent.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.dataset.drop = 'before';
      }}
      onDragLeave={(e) => {
        delete e.currentTarget.dataset.drop;
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        delete e.currentTarget.dataset.drop;
        const fromId = e.dataTransfer.getData('text/agent-id');
        if (fromId) onDropAgent(fromId, agent);
      }}
      onKeyDown={(e) => {
        if (!e.altKey) return;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onNudge(agent.id, -1);
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onNudge(agent.id, 1);
        }
      }}
    >
      <StatusRing status={agent.status}>
        <Avatar name={agent.name} size="sm" />
      </StatusRing>
      {collapsed ? (
        agent.askedYou ? <span className="paper-agent-asked-dot" title="Asked you" /> : null
      ) : (
        <>
          <span className="paper-agent-copy">
            <span className="paper-agent-name">{agent.name}</span>
            <span className="paper-agent-live" title={`${agent.status} · ${agent.line}`}>
              <span className="paper-agent-status">{agent.status}</span>
              <span className="paper-agent-line">{agent.line}</span>
            </span>
          </span>
          {agent.askedYou ? (
            <Badge tone="danger" className="paper-agent-asked">
              asked
            </Badge>
          ) : null}
          <span className="paper-agent-grip" aria-hidden="true">
            <GripVertical size={14} />
          </span>
        </>
      )}
    </a>
  );

  if (collapsed) {
    return <Tooltip content={`${agent.name} · ${agent.line}`}>{row}</Tooltip>;
  }
  if (dragging) return row;
  return (
    <div className="paper-agent-wrap">
      <HoverCard content={<AgentCard agent={agent} />}>{row}</HoverCard>
      <AgentOverflowMenu agent={{ id: agent.id, name: agent.name, isGod: agent.id === 'god' }} />
    </div>
  );
}

export function Sidebar({
  loc,
  collapsed,
  agentsOnly,
  onAgentsOnly,
  grouped,
  collapsedProjects,
  onToggleProject,
  onMoveAgent,
  notes,
  noteQuery,
  onNoteQuery,
  onNewNote,
  activeNoteId,
  inboxCount = 0
}: {
  loc: { route: PaperRoute; agentId?: string; noteId?: string };
  collapsed: boolean;
  agentsOnly: boolean;
  onAgentsOnly: (on: boolean) => void;
  grouped: Array<{ project: PaperProject; items: PaperAgent[] }>;
  collapsedProjects: string[];
  onToggleProject: (id: string) => void;
  onMoveAgent: (fromId: string, beforeId: string | null, projectId: string) => void;
  notes: PaperNote[];
  noteQuery: string;
  onNoteQuery: (q: string) => void;
  onNewNote: () => void;
  activeNoteId?: string;
  inboxCount?: number;
}): JSX.Element {
  const floor = useFloor();
  const archiveCopy = copyFor(currentLang());
  const archivedIds = new Set(floor.agents.filter((a) => a.archived).map((a) => a.id));
  const archivedCount = floor.agents.filter((a) => a.archived).length;
  const liveGrouped = grouped.map((g) => ({ ...g, items: g.items.filter((a) => !archivedIds.has(a.id)) }));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [notesH, setNotesH] = useState(() => {
    try { return Number(localStorage.getItem('paper.notesHeight')) || NOTES_DEFAULT; } catch { return NOTES_DEFAULT; }
  });
  const [notesOpen, setNotesOpen] = useState(() => {
    try { return localStorage.getItem('paper.notesCollapsed') !== '1'; } catch { return true; }
  });
  const splitDrag = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const persistNotes = useCallback((h: number) => {
    try { localStorage.setItem('paper.notesHeight', String(h)); } catch { /* noop */ }
  }, []);

  const notesMaxFor = useCallback((sidebarH: number): number => {
    const root = sidebarRef.current;
    if (!root) return NOTES_DEFAULT;
    const agents = root.querySelector('.paper-sidebar-agents') as HTMLElement | null;
    let chrome = 0;
    for (const child of Array.from(root.children)) {
      if (child === agents || (child as HTMLElement).classList.contains('paper-sidebar-notes')) continue;
      chrome += (child as HTMLElement).offsetHeight;
    }
    return Math.max(NOTES_HEAD, sidebarH - chrome - AGENTS_MIN);
  }, []);

  useLayoutEffect(() => {
    const root = sidebarRef.current;
    if (!root || collapsed) return;
    const apply = (): void => {
      const max = notesMaxFor(root.clientHeight);
      setNotesH((prev) => {
        const next = Math.min(Math.max(prev, NOTES_HEAD), max);
        return next === prev ? prev : next;
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(root);
    return () => ro.disconnect();
  }, [collapsed, notesOpen, agentsOnly, notesMaxFor]);

  const onSplitDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    splitDrag.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onSplitMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!splitDrag.current || !sidebarRef.current) return;
    const rect = sidebarRef.current.getBoundingClientRect();
    const max = notesMaxFor(rect.height);
    const next = Math.min(Math.max(rect.bottom - e.clientY, NOTES_HEAD), max);
    setNotesH(next);
  }, [notesMaxFor]);

  const onSplitUp = useCallback(() => {
    if (!splitDrag.current) return;
    splitDrag.current = false;
    persistNotes(notesH);
  }, [notesH, persistNotes]);

  const shownNotes = notes.filter((n) => {
    const q = noteQuery.trim().toLowerCase();
    if (!q) return true;
    return `${n.title} ${n.body}`.toLowerCase().includes(q);
  });
  const flat = liveGrouped.flatMap((g) => g.items);

  function nudge(id: string, dir: -1 | 1): void {
    const i = flat.findIndex((a) => a.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= flat.length) return;
    const agent = flat[i];
    const target = flat[j];
    if (dir === -1) onMoveAgent(agent.id, target.id, target.projectId);
    else onMoveAgent(agent.id, flat[j + 1]?.id ?? null, target.projectId);
  }

  return (
    <aside
      ref={sidebarRef}
      className="paper-sidebar"
      data-collapsed={collapsed ? 'true' : undefined}
      data-notes-open={notesOpen ? 'true' : undefined}
      onDragStart={(e) => {
        const from = e.dataTransfer.getData('text/agent-id');
        if (from) setDraggingId(from);
        else {
          const href = (e.target as HTMLElement).closest('a')?.getAttribute('href') ?? '';
          const id = href.split('/').pop();
          if (id) setDraggingId(id);
        }
      }}
      onDragEnd={() => setDraggingId(null)}
    >
      <div className="paper-sidebar-head">
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="Sidebar menu" size="sm">
              <MoreHorizontal size={16} />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuCheckboxItem checked={agentsOnly} onCheckedChange={onAgentsOnly}>
              Agents & notes only
            </MenuCheckboxItem>
          </MenuContent>
        </Menu>
      </div>
      {agentsOnly ? null : (
        <nav className="paper-sidebar-nav" aria-label="Workspace">
          <a
            className="paper-nav"
            href={hrefFor('home')}
            aria-label="Home"
            aria-current={loc.route === 'home' ? 'page' : undefined}
          >
            <Home size={16} />
            {collapsed ? null : 'Home'}
          </a>
          {NAV.map((item) => {
            const Icon = ICONS[item.id] ?? Home;
            return (
              <a
                key={item.id}
                className="paper-nav"
                href={hrefFor(item.id)}
                aria-label={item.label}
                aria-current={loc.route === item.id ? 'page' : undefined}
              >
                <Icon size={16} />
                {collapsed ? null : item.label}
                {item.id === 'inbox' && inboxCount > 0 ? (
                  <Badge tone="danger" className="paper-nav-count" aria-label={`${inboxCount} need you`}>
                    {inboxCount}
                  </Badge>
                ) : !collapsed && item.hint ? (
                  <span className="paper-nav-badge">{item.hint}</span>
                ) : null}
              </a>
            );
          })}
        </nav>
      )}

      <div className="paper-sidebar-agents">
        <div className="paper-nav-label">{collapsed ? '·' : 'Agents'}</div>
        {liveGrouped.map((g) => {
          const shut = collapsedProjects.includes(g.project.id);
          return (
            <section
              key={g.project.id}
              className="paper-project"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData('text/agent-id');
                if (fromId) onMoveAgent(fromId, null, g.project.id);
              }}
            >
              {collapsed ? (
                <div className="paper-project-tick" title={g.project.name} />
              ) : (
                <button
                  type="button"
                  className="paper-project-h"
                  onClick={() => onToggleProject(g.project.id)}
                  aria-expanded={!shut}
                >
                  {shut ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span>{g.project.name}</span>
                  <span className="paper-nav-badge">{g.items.length}</span>
                </button>
              )}
              {shut && !collapsed ? null : (
                <div className="paper-project-list">
                  {g.items.map((a) => (
                    <AgentRow
                      key={a.id}
                      agent={a}
                      current={!!loc.agentId && loc.agentId === a.id && (loc.route === 'agent' || loc.route === 'orchestrator')}
                      collapsed={collapsed}
                      dragging={draggingId === a.id}
                      onNudge={nudge}
                      onDropAgent={(fromId, target) => {
                        if (fromId !== target.id) onMoveAgent(fromId, target.id, target.projectId);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {collapsed ? null : (
        <div
          className="paper-notes-split"
          role="separator"
          aria-orientation="horizontal"
          aria-valuenow={Math.round(notesH)}
          aria-label="Resize notes"
          tabIndex={0}
          onPointerDown={onSplitDown}
          onPointerMove={onSplitMove}
          onPointerUp={onSplitUp}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') setNotesH((h) => {
              const max = sidebarRef.current ? notesMaxFor(sidebarRef.current.clientHeight) : 360;
              const n = Math.min(h + 16, max);
              persistNotes(n);
              return n;
            });
            if (e.key === 'ArrowDown') setNotesH((h) => { const n = Math.max(h - 16, NOTES_HEAD); persistNotes(n); return n; });
          }}
        />
      )}

      <div className="paper-sidebar-notes" style={collapsed || !notesOpen ? undefined : { flex: `0 1 ${notesH}px` }}>
        <div className="paper-notes-head">
          <a
            className="paper-nav"
            href={hrefFor('notes')}
            aria-label="Notes"
            aria-current={loc.route === 'notes' && !activeNoteId ? 'page' : undefined}
          >
            <StickyNote size={16} />
            {collapsed ? null : 'Notes'}
          </a>
          {collapsed ? null : (
            <>
              <IconButton
                label={notesOpen ? 'Collapse notes' : 'Expand notes'}
                size="sm"
                onClick={() => {
                  const next = !notesOpen;
                  setNotesOpen(next);
                  try { localStorage.setItem('paper.notesCollapsed', next ? '0' : '1'); } catch { /* noop */ }
                }}
              >
                {notesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </IconButton>
              <IconButton label="New note" size="sm" onClick={onNewNote}>
                <Plus size={14} />
              </IconButton>
            </>
          )}
        </div>
        {collapsed || !notesOpen ? null : (
          <>
            <Input
              className="paper-notes-search"
              placeholder="Search notes"
              value={noteQuery}
              onChange={(e) => onNoteQuery(e.target.value)}
              aria-label="Search notes"
            />
            <div className="paper-notes-list">
              {shownNotes.length === 0 ? (
                <p className="paper-notes-empty">No notes</p>
              ) : (
                shownNotes.map((n) => (
                  <a
                    key={n.id}
                    className="paper-note-row"
                    href={hrefFor('notes', n.id)}
                    aria-current={activeNoteId === n.id ? 'page' : undefined}
                  >
                    <span className="paper-note-title">{n.title || 'Untitled'}</span>
                    <span className="paper-note-snippet">{n.body || 'Empty'}</span>
                  </a>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <a
        className="paper-nav paper-sidebar-archive"
        href={hrefFor('archived')}
        aria-current={loc.route === 'archived' ? 'page' : undefined}
        aria-label={archiveCopy.footer(archivedCount)}
      >
        <Archive size={16} />
        {collapsed ? null : archiveCopy.footer(archivedCount)}
      </a>
    </aside>
  );
}
