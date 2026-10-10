import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Mic, Moon, PanelRight, Sun, SunMoon, User } from 'lucide-react';
import {
  Avatar, Badge, EmptyState, IconButton, Kbd,
  Menu, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger,
  Sheet, SheetContent, StatusRing, Tooltip, TooltipProvider
} from '@/ui';
import { APP_DISPLAY_NAME } from '@shared/forkIdentity';
import { setClassicUi } from './classicFlag';
import { CommandPalette, useCommandPaletteHotkey } from './CommandPalette';
import { NotesPane } from './NotesPane';
import { hrefFor, isGodRoom, parseHash, type PaperRoute } from './routes';
import { SCREENS } from './screens';
import { Screen as OrchestratorScreen } from './screens/orchestrator/screen';
import { useInboxNeedsYou } from './screens/inbox/badge';
import { Sidebar } from './Sidebar';
import { ProSidebarProvider, useProSidebar } from './sidebarState';
import { floorStatusLine, spendTodayLabel } from './statusLine';
import { applyPref, readThemePref, resolvedTheme, systemIsDark, writeThemePref, type PaperThemePref } from './themePref';
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
    connections: { title: 'Connections', lede: 'REST APIs agents call without seeing the key.' },
    stapler: { title: 'Stapler', lede: 'Floating ring and captures — MDF-25.' },
    notes: { title: 'Notes', lede: 'Private, searchable, on this machine.' },
    agent: { title: 'Agent', lede: '' },
    orchestrator: { title: agentName ?? 'Michael', lede: 'Routing, the board, breaker and fleet spend, on the agent room.' }
  };
  return map[route];
}

function defaultInspector(route: PaperRoute): boolean {
  return route !== 'inbox';
}

function readInspectorMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('paper.inspectorByRoute');
    return raw ? JSON.parse(raw) as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

export function PaperApp(): JSX.Element {
  return (
    <ProSidebarProvider>
      <PaperShell />
    </ProSidebarProvider>
  );
}

function PaperShell(): JSX.Element {
  const [loc, setLoc] = useState(() => parseHash(window.location.hash));
  const [themePref, setThemePref] = useState<PaperThemePref>(readThemePref);
  const [systemDark, setSystemDark] = useState(systemIsDark);
  const [sidebar, setSidebar] = useState(() => {
    try { return Number(localStorage.getItem('paper.sidebarWidth')) || 280; } catch { return 280; }
  });
  const [inspectorMap, setInspectorMap] = useState(readInspectorMap);
  const [palette, setPalette] = useState(false);
  const [noteQuery, setNoteQuery] = useState('');
  const [shellWidth, setShellWidth] = useState(() => window.innerWidth);
  const drag = useRef(false);
  const rail = useProSidebar();
  const needsYou = useInboxNeedsYou();
  useCommandPaletteHotkey(() => setPalette((v) => !v));

  const theme = resolvedTheme(themePref, systemDark);

  useLayoutEffect(() => {
    applyPref(themePref, systemDark);
  }, [themePref, systemDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = (): void => setSystemDark(mq.matches);
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  useEffect(() => {
    const onHash = (): void => setLoc(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onResize = (): void => setShellWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
  const statusLine = floorStatusLine(rail.agents);
  const spend = spendTodayLabel(rail.agents);
  const Screen = isGodRoom(loc) ? OrchestratorScreen : SCREENS[loc.route];

  const inspectorWanted = inspectorMap[loc.route] ?? defaultInspector(loc.route);
  const hasSelection = Boolean(agent || note);
  const narrow = shellWidth <= 1100;
  const showDock = inspectorWanted && hasSelection && !narrow;
  const showSheet = inspectorWanted && hasSelection && narrow;

  function setInspectorForRoute(on: boolean): void {
    setInspectorMap((m) => {
      const next = { ...m, [loc.route]: on };
      try { localStorage.setItem('paper.inspectorByRoute', JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }

  function chooseTheme(value: string): void {
    const pref = value as PaperThemePref;
    setThemePref(pref);
    writeThemePref(pref);
  }

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

  const extraActions = [
    ...rail.notes.map((n) => ({
      id: `note.${n.id}`,
      label: `Note: ${n.title || 'Untitled'}`,
      group: 'Notes',
      run: () => goNote(n.id)
    })),
    {
      id: 'sidebar.agentsOnly',
      label: rail.agentsOnly ? 'Show full sidebar' : 'Agents & notes only',
      group: 'View',
      keywords: 'compact rail hide nav',
      run: () => rail.setAgentsOnly(!rail.agentsOnly)
    },
    {
      id: 'view.classic',
      label: 'Classic UI',
      group: 'View',
      keywords: 'pixel office command center',
      run: () => setClassicUi(true)
    }
  ];

  const inspectorBody = agent ? (
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
            <a className="pc-key pi-ticket" href={`#/tasks/${encodeURIComponent(agent.ticket.key)}`}>
              {agent.ticket.key}
            </a>{' '}
            {agent.ticket.title}
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
  ) : null;

  const ThemeIcon = themePref === 'system' ? SunMoon : theme === 'dark' ? Moon : Sun;

  return (
    <TooltipProvider>
      <div className="paper-shell" data-narrow={narrow ? 'true' : undefined}>
        <a className="paper-skip" href="#paper-main">Skip to content</a>
        <header className="paper-titlebar">
          <span className="paper-titlebar-brand">{APP_DISPLAY_NAME}</span>
          <button type="button" className="paper-titlebar-search" onClick={() => setPalette(true)}>
            Search or jump
            <Kbd>⌘K</Kbd>
          </button>
          <span className="paper-titlebar-spacer" />
          <span className="paper-titlebar-meta">{statusLine}</span>
          <span className="paper-titlebar-spend" title="Spend today">{spend} today</span>
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={`Theme (${themePref === 'system' ? 'system' : theme})`}>
                <ThemeIcon size={16} />
              </IconButton>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuRadioGroup value={themePref} onValueChange={chooseTheme}>
                <MenuRadioItem value="system">System</MenuRadioItem>
                <MenuRadioItem value="light">Light</MenuRadioItem>
                <MenuRadioItem value="dark">Dark</MenuRadioItem>
                <MenuRadioItem value="hc">High contrast</MenuRadioItem>
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
          <Tooltip content="Voice (Stapler)">
            <IconButton label="Voice" onClick={() => { window.location.hash = hrefFor('stapler'); }}>
              <Mic size={16} />
            </IconButton>
          </Tooltip>
          <Menu>
            <MenuTrigger asChild>
              <IconButton label="Account">
                <User size={16} />
              </IconButton>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => setClassicUi(true)}>Classic UI</MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => setPalette(true)}>Command palette</MenuItem>
            </MenuContent>
          </Menu>
          <IconButton
            label={inspectorWanted ? 'Hide inspector' : 'Show inspector'}
            onClick={() => setInspectorForRoute(!inspectorWanted)}
          >
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
          {showDock ? (
            <aside className="paper-inspector">{inspectorBody}</aside>
          ) : null}
          <Sheet open={showSheet} onOpenChange={(open) => setInspectorForRoute(open)}>
            <SheetContent title={agent?.name ?? note?.title ?? 'Inspector'}>
              {inspectorBody}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </TooltipProvider>
  );
}
