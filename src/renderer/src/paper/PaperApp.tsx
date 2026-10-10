import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Inbox, ListTodo, Timer, Brain, Puzzle, Users, CircleDot, StickyNote, Home, PanelRight
} from 'lucide-react';
import { applyPaperTheme, paperThemeFromRoot, type PaperTheme } from '@/design/paper';
import { Avatar, Button, EmptyState, IconButton, Kbd, Tooltip, TooltipProvider } from '@/ui';
import { setClassicUi } from './classicFlag';
import { NAV, hrefFor, parseHash, type PaperRoute } from './routes';
import './shell.css';

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

const DEMO_AGENTS = [
  { id: 'god', name: 'Michael', line: 'idle' },
  { id: 'developer-mv2fn62v', name: 'Developer', line: 'working' },
  { id: 'tester-mv2fnyz5', name: 'Tester', line: 'idle' }
];

function screenCopy(route: PaperRoute, agentId?: string): { title: string; lede: string } {
  if (route === 'agent') {
    const a = DEMO_AGENTS.find((x) => x.id === agentId);
    return { title: a?.name ?? 'Agent', lede: 'Agent room lands in MDF-13. Terminal + overview, messages, tasks.' };
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
    notes: { title: 'Notes', lede: 'Private searchable notes on the Pro sidebar — MDF-11.' },
    agent: { title: 'Agent', lede: '' }
  };
  return map[route];
}

export function PaperApp(): JSX.Element {
  const [loc, setLoc] = useState(() => parseHash(window.location.hash));
  const [theme, setTheme] = useState<PaperTheme>(() => paperThemeFromRoot());
  const [sidebar, setSidebar] = useState(() => {
    try { return Number(localStorage.getItem('paper.sidebarWidth')) || 248; } catch { return 248; }
  });
  const [inspector, setInspector] = useState(true);
  const drag = useRef(false);

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
    const next = Math.min(360, Math.max(64, e.clientX));
    setSidebar(next);
  }, []);

  const onUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = false;
    try { localStorage.setItem('paper.sidebarWidth', String(sidebar)); } catch { /* noop */ }
  }, [sidebar]);

  const copy = useMemo(() => screenCopy(loc.route, loc.agentId), [loc]);
  const collapsed = sidebar <= 72;

  return (
    <TooltipProvider>
      <div className="paper-shell">
        <header className="paper-titlebar">
          <span className="paper-titlebar-brand">Munder Difflin</span>
          <button type="button" className="paper-titlebar-search" onClick={() => { /* MDF-9 */ }}>
            Search or jump
            <Kbd>⌘K</Kbd>
          </button>
          <span className="paper-titlebar-spacer" />
          <span className="paper-titlebar-meta">{DEMO_AGENTS.length} agents · $0.00 today</span>
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
          <aside className="paper-sidebar" style={{ width: sidebar }}>
            <nav className="paper-sidebar-nav">
              <a
                className="paper-nav"
                href={hrefFor('home')}
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
                    aria-current={loc.route === item.id ? 'page' : undefined}
                  >
                    <Icon size={16} />
                    {collapsed ? null : item.label}
                    {!collapsed && item.hint ? <span className="paper-nav-badge">{item.hint}</span> : null}
                  </a>
                );
              })}
              <div className="paper-nav-label">{collapsed ? '·' : 'Agents'}</div>
              {DEMO_AGENTS.map((a) => (
                <a
                  key={a.id}
                  className="paper-agent-row"
                  href={hrefFor('agent', a.id)}
                  aria-current={loc.route === 'agent' && loc.agentId === a.id ? 'page' : undefined}
                >
                  <Avatar name={a.name} size="sm" />
                  {collapsed ? null : a.name}
                  {collapsed ? null : <span className="paper-agent-live">{a.line}</span>}
                </a>
              ))}
              <a
                className="paper-nav"
                href={hrefFor('notes')}
                aria-current={loc.route === 'notes' ? 'page' : undefined}
              >
                <StickyNote size={16} />
                {collapsed ? null : 'Notes'}
              </a>
            </nav>
          </aside>
          <div
            className="paper-sidebar-handle"
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={sidebar}
            tabIndex={0}
            onPointerDown={onHandle}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setSidebar((w) => Math.max(64, w - 16));
              if (e.key === 'ArrowRight') setSidebar((w) => Math.min(360, w + 16));
            }}
          />
          <main className="paper-main">
            <h1>{copy.title}</h1>
            <p className="lede">{copy.lede}</p>
            <EmptyState title="Not wired yet" description="This screen is a routed slot. Data hooks up in Phase 1." />
          </main>
          {inspector ? (
            <aside className="paper-inspector">
              <h2>Inspector</h2>
              <p className="lede" style={{ margin: 0 }}>
                Context for the current selection. Empty until a card is picked.
              </p>
            </aside>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}

