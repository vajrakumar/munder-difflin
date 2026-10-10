import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelRight } from 'lucide-react';
import { applyPaperTheme, paperThemeFromRoot, type PaperTheme } from '@/design/paper';
import { Avatar, Badge, Button, EmptyState, IconButton, Kbd, StatusRing, Tooltip, TooltipProvider } from '@/ui';
import { APP_DISPLAY_NAME } from '@shared/forkIdentity';
import { setClassicUi } from './classicFlag';
import { CommandPalette, useCommandPaletteHotkey } from './CommandPalette';
import { NotesPane } from './NotesPane';
import { hrefFor, parseHash, type PaperRoute } from './routes';
import { SCREENS } from './screens';
import { useInboxNeedsYou } from './screens/inbox/badge';
import { Sidebar } from './Sidebar';
import { useProSidebar } from './sidebarState';
import './shell.css';

function screenCopy(route: PaperRoute, agentName?: string): { title: string; lede: string } {
  if (route === 'agent') {
    return {
      title: agentName ?? 'Agent',
      lede: 'Agent room lands in MDF-13. Terminal + overview, messages, tasks.'
    };
  }
  const map: Record<PaperRoute, { title: string; lede: string }> = {
    home: { title: 'Home', lede: 'Live agent tiles land in MDF-12. Office view stays optional.' },
    inbox: { title: 'Inbox', lede: 'Needs you, agents, outside, team — unified in MDF-15.' },
    tasks: { title: 'Tasks', lede: 'Board, list and timeline in MDF-16.' },
    automations: { title: 'Automations', lede: 'Schedules, webhooks, quiet hours — MDF-17.' },
    memory: { title: 'Memory', lede: 'Cards, list and graph — MDF-18.' },
    capabilities: { title: 'Capabilities', lede: 'Marketplace and who-has-what — MDF-19.' },
    temps: { title: 'Temps', lede: 'History of short-lived workers — MDF-20.' },
    stapler: { title: 'Stapler', lede: 'Floating ring and captures — MDF-25.' },
    notes: { title: 'Notes', lede: 'Private, searchable, on this machine.' },
    agent: { title: 'Agent', lede: '' }
  };
  return map[route];
}

export function PaperApp(): JSX.Element {
  const [loc, setLoc] = useState(() => parseHash(window.location.hash));
  const [theme, setTheme] = useState<PaperTheme>(() => paperThemeFromRoot());
  const [sidebar, setSidebar] = useState(() => {
    try { return Number(localStorage.getItem('paper.sidebarWidth')) || 280; } catch { return 280; }
  });
  const [inspector, setInspector] = useState(true);
  const [palette, setPalette] = useState(false);
  const [noteQuery, setNoteQuery] = useState('');
  const drag = useRef(false);
  const rail = useProSidebar();
  const needsYou = useInboxNeedsYou();
  useCommandPaletteHotkey(() => setPalette((v) => !v));

  useEffect(() => {
    applyPaperTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onHash = (): void => setLoc(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onHandle = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const next = Math.min(420, Math.max(64, e.clientX));
    setSidebar(next);
  }, []);

  const onUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = false;
    try { localStorage.setItem('paper.sidebarWidth', String(sidebar)); } catch { /* noop */ }
  }, [sidebar]);

  const agent = rail.agents.find((a) => a.id === loc.agentId);
  const note = rail.notes.find((n) => n.id === loc.noteId);
  const copy = useMemo(
    () => screenCopy(loc.route, agent?.name),
    [loc.route, agent?.name]
  );
  const collapsed = sidebar <= 72;
  const liveCount = rail.agents.filter((a) =>
    a.status === 'working' || a.status === 'thinking' || a.status === 'looping'
  ).length;
  const askedCount = rail.agents.filter((a) => a.askedYou).length;
  const Screen = SCREENS[loc.route];

  function goNote(id: string): void {
    window.location.hash = hrefFor('notes', id);
  }

  function handleNewNote(): void {
    const n = rail.createNote();
    goNote(n.id);
  }

  function handleDeleteNote(id: string): void {
    rail.removeNote(id);
    window.location.hash = hrefFor('notes');
  }

  const extraActions = rail.notes.map((n) => ({
    id: `note.${n.id}`,
    label: `Note: ${n.title || 'Untitled'}`,
    group: 'Notes',
    run: () => goNote(n.id)
  }));

  return (
    <TooltipProvider>
      <div className="paper-shell">
        <header className="paper-titlebar">
          <span className="paper-titlebar-brand">{APP_DISPLAY_NAME}</span>
          <button type="button" className="paper-titlebar-search" onClick={() => setPalette(true)}>
            Search or jump
            <Kbd>⌘K</Kbd>
          </button>
          <span className="paper-titlebar-spacer" />
          <span className="paper-titlebar-meta">
            {liveCount} live · {askedCount} asked · {rail.agents.length} agents
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : t === 'dark' ? 'hc' : 'light'))}
          >
            {theme}
          </Button>
          <Tooltip content="Fall back to the pixel UI">
            <Button size="sm" variant="secondary" onClick={() => setClassicUi(true)}>
              Classic UI
            </Button>
          </Tooltip>
          <IconButton label={inspector ? 'Hide inspector' : 'Show inspector'} onClick={() => setInspector((v) => !v)}>
            <PanelRight size={16} />
          </IconButton>
        </header>
        <div className="paper-body">
          <div className="paper-sidebar-wrap" style={{ width: sidebar }}>
            <Sidebar
              loc={loc}
              collapsed={collapsed}
              agentsOnly={rail.agentsOnly}
              onAgentsOnly={rail.setAgentsOnly}
              grouped={rail.grouped}
              collapsedProjects={rail.collapsedProjects}
              onToggleProject={rail.toggleProject}
              onMoveAgent={rail.moveAgent}
              notes={rail.notes}
              noteQuery={noteQuery}
              onNoteQuery={setNoteQuery}
              onNewNote={handleNewNote}
              activeNoteId={loc.noteId}
              inboxCount={needsYou}
            />
          </div>
          <div
            className="paper-sidebar-handle"
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={sidebar}
            aria-label="Resize sidebar"
            tabIndex={0}
            onPointerDown={onHandle}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setSidebar((w) => Math.max(64, w - 16));
              if (e.key === 'ArrowRight') setSidebar((w) => Math.min(420, w + 16));
            }}
          />
          <main id="paper-main" className={loc.route === 'notes' ? 'paper-main paper-main-notes' : 'paper-main'}>
            {loc.route === 'notes' ? (
              <NotesPane
                note={note}
                onChange={rail.upsertNote}
                onDelete={handleDeleteNote}
                onCreate={handleNewNote}
              />
            ) : Screen ? (
              <Screen />
            ) : (
              <>
                <h1>{copy.title}</h1>
                <p className="lede">{copy.lede}</p>
                <EmptyState title="Not wired yet" description="This screen is a routed slot. Data hooks up in Phase 1." />
              </>
            )}
          </main>
          <CommandPalette open={palette} onOpenChange={setPalette} extra={extraActions} />
          {inspector ? (
            <aside className="paper-inspector">
              {agent ? (
                <>
                  <h2>{agent.name}</h2>
                  <div className="paper-inspector-agent">
                    <StatusRing status={agent.status}>
                      <Avatar name={agent.name} />
                    </StatusRing>
                    <p className="lede">{agent.line}</p>
                    {agent.askedYou ? <Badge tone="danger">Asked you</Badge> : null}
                    {agent.ticket ? (
                      <p>
                        <Badge tone="accent">{agent.ticket.key}</Badge> {agent.ticket.title}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : note ? (
                <>
                  <h2>Note</h2>
                  <p className="lede">{note.title}</p>
                  <p>{note.body.slice(0, 180) || 'Empty'}</p>
                </>
              ) : (
                <>
                  <h2>Inspector</h2>
                  <p className="lede">
                    Hover an agent for ticket details. Drag to reorder. Notes live at the bottom of the rail.
                  </p>
                </>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}
