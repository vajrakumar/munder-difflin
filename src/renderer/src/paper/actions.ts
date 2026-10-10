import type { LucideIcon } from 'lucide-react';
import {
  Archive, Brain, CircleDot, Home, Inbox, KeyRound, ListTodo, Puzzle, Search, StickyNote,
  Timer, UserPlus, Users, Waypoints
} from 'lucide-react';
import { filterActions as rankActions, highlightMatch } from './actionSearch';
import { DEFAULT_AGENTS } from './demoData';
import { hrefFor, type PaperRoute } from './routes';

export { highlightMatch };

export type PaperAction = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  shortcut?: string;
  icon?: LucideIcon;
  run: () => void;
};

function go(route: PaperRoute, agentId?: string): void {
  window.location.hash = hrefFor(route, agentId);
}

const NAV_META: Array<[PaperRoute, string, string, string, LucideIcon]> = [
  ['home', 'Go to Home', 'home floor', 'G H', Home],
  ['inbox', 'Go to Inbox', 'ask me mail slack', 'G I', Inbox],
  ['tasks', 'Go to Tasks', 'board tickets kanban', 'G T', ListTodo],
  ['automations', 'Go to Automations', 'schedule webhook cron', 'G A', Timer],
  ['memory', 'Go to Memory', 'search palace graph', 'G M', Brain],
  ['capabilities', 'Go to Capabilities', 'skills mcp tools', 'G C', Puzzle],
  ['temps', 'Go to Temps', 'workers ephemeral spawn', 'G P', Users],
  ['connections', 'Go to Connections', 'integrations api secrets rest', 'G K', KeyRound],
  ['stapler', 'Go to Stapler', 'dictate meeting capture', 'G S', CircleDot],
  ['notes', 'Go to Notes', 'private', 'G N', StickyNote],
  ['orchestrator', 'Open Orchestrator', 'michael god routing breaker budget board', 'G O', Waypoints]
];

const NAV_ACTIONS: PaperAction[] = NAV_META.map(([id, label, keywords, shortcut, icon]) => ({
  id: `nav.${id}`,
  label,
  group: 'Navigate',
  keywords,
  shortcut,
  icon,
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
      icon: UserPlus,
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
      icon: Users,
      run: () => go('agent', a.id)
    })),
    {
      id: 'note.new',
      label: 'New note',
      group: 'Notes',
      keywords: 'write private',
      shortcut: 'N',
      icon: StickyNote,
      run: () => go('notes')
    },
    {
      id: 'memory.search',
      label: 'Search memory',
      group: 'Memory',
      keywords: 'recall palace',
      icon: Search,
      run: () => go('memory')
    },
    {
      id: 'auto.run',
      label: 'Run automation…',
      group: 'Automations',
      keywords: 'trigger mission',
      icon: Timer,
      run: () => go('automations')
    },
    {
      id: 'caps.marketplace',
      label: 'Capabilities: Marketplace',
      group: 'Capabilities',
      keywords: 'skills mcp install enable catalog',
      run: () => {
        go('capabilities');
        window.dispatchEvent(new CustomEvent('paper:caps', { detail: { tab: 'marketplace' } }));
      }
    },
    {
      id: 'caps.installed',
      label: 'Capabilities: Installed',
      group: 'Capabilities',
      keywords: 'skills uninstall reveal',
      run: () => {
        go('capabilities');
        window.dispatchEvent(new CustomEvent('paper:caps', { detail: { tab: 'installed' } }));
      }
    },
    {
      id: 'caps.matrix',
      label: 'Capabilities: Who has what',
      group: 'Capabilities',
      keywords: 'matrix grants bundle apply',
      run: () => {
        go('capabilities');
        window.dispatchEvent(new CustomEvent('paper:caps', { detail: { tab: 'matrix' } }));
      }
    },
    {
      id: 'caps.apply',
      label: 'Apply capability changes',
      group: 'Capabilities',
      keywords: 'apply grants restart',
      run: () => {
        go('capabilities');
        window.dispatchEvent(new CustomEvent('paper:caps', { detail: { tab: 'matrix', apply: true } }));
      }
    },
    {
      id: 'caps.search',
      label: 'Search capabilities',
      group: 'Capabilities',
      keywords: 'find skill mcp',
      run: () => {
        go('capabilities');
        window.dispatchEvent(new CustomEvent('paper:caps', { detail: { search: true } }));
      }
    },
    {
      id: 'temps.stop',
      label: 'Stop selected temp',
      group: 'Temps',
      keywords: 'kill worker reap x',
      run: () => go('temps')
    },
    {
      id: 'connections.add',
      label: 'Add connection',
      group: 'Connections',
      keywords: 'integration rest api secret n',
      run: () => go('connections')
    },
    {
      id: 'connections.test',
      label: 'Test selected connection',
      group: 'Connections',
      keywords: 'probe ping t',
      run: () => go('connections')
    },
    {
      id: 'nav.archived',
      label: 'Go to Archived agents',
      group: 'Navigate',
      keywords: 'archive reopen closed hidden',
      shortcut: 'G R',
      icon: Archive,
      run: () => go('archived')
    }
  ];
}

export function filterActions(
  actions: PaperAction[],
  query: string,
  recent: string[] = []
): PaperAction[] {
  return rankActions(actions, query, recent);
}
