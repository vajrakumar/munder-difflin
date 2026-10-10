export type PaperRoute =
  | 'home'
  | 'inbox'
  | 'tasks'
  | 'automations'
  | 'memory'
  | 'capabilities'
  | 'temps'
  | 'stapler'
  | 'notes'
  | 'agent'
  | 'orchestrator';

export type PaperLocation = {
  route: PaperRoute;
  agentId?: string;
  noteId?: string;
  /** Ticket key or id, from `#/tasks/MDF-16`. */
  taskId?: string;
};

export const NAV: Array<{ id: PaperRoute; label: string; hint?: string }> = [
  { id: 'inbox', label: 'Inbox', hint: 'Needs you' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'automations', label: 'Automations' },
  { id: 'memory', label: 'Memory' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'temps', label: 'Temps' },
  { id: 'stapler', label: 'Stapler' }
];

export function parseHash(hash: string): PaperLocation {
  const raw = hash.replace(/^#\/?/, '');
  const [head, rest] = raw.split('/');
  if (head === 'orchestrator') return { route: 'orchestrator', agentId: 'god' };
  if (head === 'agent' && rest) return { route: 'agent', agentId: rest };
  if (head === 'notes' && rest) return { route: 'notes', noteId: rest };
  if (head === 'tasks' && rest) return { route: 'tasks', taskId: decodeURIComponent(rest) };
  const ids = new Set(NAV.map((n) => n.id));
  ids.add('home');
  ids.add('notes');
  ids.add('orchestrator');
  if (head && ids.has(head as PaperRoute)) return { route: head as PaperRoute };
  return { route: 'home' };
}

export function hrefFor(route: PaperRoute, id?: string): string {
  if (route === 'orchestrator' || (route === 'agent' && id === 'god')) return '#/orchestrator';
  if (route === 'agent' && id) return `#/agent/${id}`;
  if (route === 'notes' && id) return `#/notes/${id}`;
  if (route === 'tasks' && id) return `#/tasks/${encodeURIComponent(id)}`;
  if (route === 'home') return '#/';
  return `#/${route}`;
}

/** Michael's room: `#/orchestrator` or `#/agent/god`. */
export function isGodRoom(loc: PaperLocation): boolean {
  return loc.route === 'orchestrator' || (loc.route === 'agent' && loc.agentId === 'god');
}
