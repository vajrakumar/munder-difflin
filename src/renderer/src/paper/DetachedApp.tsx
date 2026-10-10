/** Minimal renderer for a detached Paper view (`?detach=terminal&agent=id`).
 *  Closing this window (or Bring back / ⌘⇧D) reattaches the view in the opener. */
import { useEffect } from 'react';
import { ArrowLeftToLine } from 'lucide-react';
import { Button, Kbd, TooltipProvider } from '@/ui';
import { TerminalView } from '@/components/TerminalView';
import { DEFAULT_AGENTS } from './demoData';
import { persistThisWindow } from './Detachable';
import { keyOf, parseDetachQuery, type DetachTarget } from './detach';
import { copyFor, currentLang } from './screens/archived/copy';
import { demoTerminal } from './screens/agent/model';
import { Screen as HomeScreen } from './screens/home/screen';
import { ProSidebarProvider } from './sidebarState';
import './shell.css';
import './screens/archived/archived.css';

function post(msg: { type: string; key: string }): void {
  try { window.opener?.postMessage(msg, '*'); } catch { /* noop */ }
  try {
    const ch = new BroadcastChannel('paper-detach');
    ch.postMessage(msg);
    ch.close();
  } catch { /* noop */ }
}

function bring(target: DetachTarget): void {
  persistThisWindow(keyOf(target));
  post({ type: 'bring', key: keyOf(target) });
  window.close();
}

function IdeStub({ agentId }: { agentId?: string }): JSX.Element {
  const name = DEFAULT_AGENTS.find((a) => a.id === agentId)?.name ?? agentId ?? 'Workspace';
  const t = copyFor(currentLang());
  return (
    <div className="paper-detach-ide">
      <aside className="paper-detach-files" aria-label={t.files}>
        <div className="paper-nav-label">{t.files}</div>
        <div className="paper-note-title">src/renderer/src/paper/screens/archived/screen.tsx</div>
        <div className="paper-note-title">src/renderer/src/paper/detach.ts</div>
        <div className="paper-note-title">src/renderer/src/paper/AgentLifecycle.tsx</div>
      </aside>
      <pre className="paper-detach-code" tabIndex={0}>
{`// ${name} · gallery IDE (same worktree, no second session)
export const route = 'archived';
`}
      </pre>
    </div>
  );
}

function TerminalStub({ agentId }: { agentId?: string }): JSX.Element {
  const agent = DEFAULT_AGENTS.find((a) => a.id === agentId);
  const name = agent?.name ?? agentId ?? 'Agent';
  return (
    <div className="paper-detach-term">
      <TerminalView initialLines={demoTerminal(name, agent?.line)} />
    </div>
  );
}

export function DetachedApp({ target }: { target: DetachTarget }): JSX.Element {
  const t = copyFor(currentLang());
  const key = keyOf(target);
  const title = target.view === 'office' ? t.office : target.view === 'ide' ? t.ide : t.terminal;

  useEffect(() => {
    document.title = `${title} · detached`;
    post({ type: 'hello', key });
    const save = (): void => persistThisWindow(key);
    const onUnload = (): void => {
      save();
      post({ type: 'closed', key });
    };
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        bring(target);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('resize', save);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('resize', save);
      window.removeEventListener('keydown', onKey);
    };
  }, [key, target, title]);

  const body = target.view === 'office'
    ? (
      <ProSidebarProvider>
        <HomeScreen />
      </ProSidebarProvider>
    )
    : target.view === 'ide'
      ? <IdeStub agentId={target.agentId} />
      : <TerminalStub agentId={target.agentId} />;

  return (
    <TooltipProvider>
      <div className="paper-shell paper-detach-shell">
        <header className="paper-titlebar">
          <span className="paper-titlebar-brand">{title}</span>
          <span className="paper-titlebar-meta">{t.sameSession}</span>
          <span className="paper-titlebar-spacer" />
          <Button variant="secondary" size="sm" onClick={() => bring(target)}>
            <ArrowLeftToLine size={14} /> {t.bring}
          </Button>
          <Kbd>⌘⇧D</Kbd>
        </header>
        <div className="paper-detach-body">{body}</div>
      </div>
    </TooltipProvider>
  );
}

export function readDetachTarget(): DetachTarget | null {
  try {
    return parseDetachQuery(window.location.search);
  } catch {
    return null;
  }
}
