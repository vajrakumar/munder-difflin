/** Stop vs Archive confirmations (MDF-22). Shared by the sidebar, the agent
 *  room, ⌘⌫, and the command palette. God cannot be stopped or archived. */
import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Archive, MoreHorizontal, Square } from 'lucide-react';
import {
  Button, Dialog, DialogContent, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, useToast
} from '@/ui';
import { archiveAgent, stopAgent, useFloor } from './data/hive';
import type { PaperAgent } from './data/model';
import { copyFor, currentLang } from './screens/archived/copy';
import { canArchive, canStop, isGod } from './screens/archived/model';
import './screens/archived/archived.css';

type Intent = { kind: 'stop' | 'archive'; agent: PaperAgent } | null;

type Api = {
  requestStop: (id: string) => void;
  requestArchive: (id: string) => void;
};

const Ctx = createContext<Api | null>(null);

export function AgentLifecycleProvider({ children }: { children: ReactNode }): JSX.Element {
  const floor = useFloor();
  const toast = useToast();
  const t = useMemo(() => copyFor(currentLang()), []);
  const [intent, setIntent] = useState<Intent>(null);

  const find = useCallback((id: string) => floor.agents.find((a) => a.id === id), [floor.agents]);

  const requestStop = useCallback((id: string) => {
    const agent = find(id);
    if (!agent) return;
    if (isGod(agent)) { toast(t.godLocked); return; }
    setIntent({ kind: 'stop', agent });
  }, [find, t, toast]);

  const requestArchive = useCallback((id: string) => {
    const agent = find(id);
    if (!agent) return;
    if (isGod(agent)) { toast(t.godLocked); return; }
    setIntent({ kind: 'archive', agent });
  }, [find, t, toast]);

  async function confirm(): Promise<void> {
    if (!intent) return;
    const { kind, agent } = intent;
    setIntent(null);
    const ok = kind === 'stop' ? await stopAgent(agent.id) : await archiveAgent(agent.id);
    toast(ok ? (kind === 'stop' ? t.stopped(agent.name) : t.archived(agent.name)) : t.error);
  }

  return createElement(
    Ctx.Provider,
    { value: { requestStop, requestArchive } },
    children,
    createElement(ConfirmDialog, { intent, t, onClose: () => setIntent(null), onConfirm: () => void confirm() })
  );
}

function ConfirmDialog({
  intent, t, onClose, onConfirm
}: {
  intent: Intent;
  t: ReturnType<typeof copyFor>;
  onClose: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const agent = intent?.agent;
  const kind = intent?.kind;
  return (
    <Dialog open={!!intent} onOpenChange={(open) => { if (!open) onClose(); }}>
      {agent && kind ? (
        <DialogContent
          title={kind === 'stop' ? t.stopTitle(agent.name) : t.archiveTitle(agent.name)}
          description={kind === 'stop' ? t.stopBody(agent.name) : t.archiveBody(agent.name)}
        >
          <div className="par-dialog-actions">
            <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
            <Button variant={kind === 'archive' ? 'danger' : 'primary'} onClick={onConfirm}>
              {kind === 'stop' ? t.confirmStop : t.confirmArchive}
            </Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

export function useAgentLifecycle(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAgentLifecycle must be used under AgentLifecycleProvider');
  return ctx;
}

export function AgentOverflowMenu({
  agent,
  collapsed
}: {
  agent: { id: string; name: string; isGod?: boolean; archived?: boolean; stopped?: boolean };
  collapsed?: boolean;
}): JSX.Element | null {
  const t = useMemo(() => copyFor(currentLang()), []);
  const life = useAgentLifecycle();
  if (isGod(agent) || agent.archived) return null;
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label={`${agent.name} actions`}
          size="sm"
          className={collapsed ? undefined : 'paper-agent-overflow'}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={14} />
        </IconButton>
      </MenuTrigger>
      <MenuContent align="end">
        {canStop(agent) ? (
          <MenuItem onSelect={() => life.requestStop(agent.id)}>
            <Square size={14} /> {t.stop}
          </MenuItem>
        ) : null}
        {canArchive(agent) ? (
          <MenuItem onSelect={() => life.requestArchive(agent.id)}>
            <Archive size={14} /> {t.archive}
          </MenuItem>
        ) : null}
      </MenuContent>
    </Menu>
  );
}
