import type { LucideIcon } from 'lucide-react';
import {
  Brain, CircleDot, Home, Inbox, ListTodo, Puzzle, Search, StickyNote,
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
  ['temps', 'Go to Temps', 'workers ephemeral', 'G P', Users],
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
