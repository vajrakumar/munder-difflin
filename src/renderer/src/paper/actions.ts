import { DEFAULT_AGENTS } from './demoData';
import { hrefFor, type PaperRoute } from './routes';

export type PaperAction = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

function go(route: PaperRoute, agentId?: string): void {
  window.location.hash = hrefFor(route, agentId);
}

const NAV_ACTIONS: PaperAction[] = (
  [
    ['home', 'Go to Home', 'home floor'],
    ['inbox', 'Go to Inbox', 'ask me mail slack'],
    ['tasks', 'Go to Tasks', 'board tickets kanban'],
    ['automations', 'Go to Automations', 'schedule webhook cron'],
    ['memory', 'Go to Memory', 'search palace graph'],
    ['capabilities', 'Go to Capabilities', 'skills mcp tools'],
    ['temps', 'Go to Temps', 'workers ephemeral'],
    ['stapler', 'Go to Stapler', 'dictate meeting capture'],
    ['notes', 'Go to Notes', 'private'],
    ['orchestrator', 'Open Orchestrator', 'michael god routing breaker budget board']
  ] as Array<[PaperRoute, string, string]>
).map(([id, label, keywords]) => ({
  id: `nav.${id}`,
  label,
  group: 'Navigate',
  keywords,
  run: () => go(id)
}));

export function defaultActions(opts?: {
  onSpawn?: () => void;
  onToast?: (msg: string) => void;
}): PaperAction[] {
  const toast = opts?.onToast ?? ((): void => { /* noop */ });
  return [
    ...NAV_ACTIONS,
    {
      id: 'agent.spawn',
      label: 'Spawn agent',
      group: 'Agents',
      keywords: 'hire add new',
      run: () => {
        opts?.onSpawn?.();
        toast('Spawn is not wired in the Paper shell yet');
      }
    },
    ...DEFAULT_AGENTS.map((a) => ({
      id: `agent.${a.id}`,
      label: `Open ${a.name}`,
      group: 'Agents',
      keywords: `${a.role} ${a.projectId} ${a.ticket?.key ?? ''}`,
      run: () => go('agent', a.id)
    })),
    {
      id: 'note.new',
      label: 'New note',
      group: 'Notes',
      keywords: 'write private',
      run: () => go('notes')
    },
    {
      id: 'memory.search',
      label: 'Search memory',
      group: 'Memory',
      keywords: 'recall palace',
      run: () => go('memory')
    },
    {
      id: 'auto.run',
      label: 'Run automation…',
      group: 'Automations',
      keywords: 'trigger mission',
      run: () => go('automations')
    }
  ];
}

export function filterActions(actions: PaperAction[], query: string): PaperAction[] {
  const q = query.trim().toLowerCase();
  if (!q) return actions;
  return actions.filter((a) =>
    `${a.label} ${a.group} ${a.hint ?? ''} ${a.keywords ?? ''} ${a.id}`.toLowerCase().includes(q)
  );
}
