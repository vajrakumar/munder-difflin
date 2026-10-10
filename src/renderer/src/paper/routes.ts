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
  | 'agent';

export type PaperLocation = {
  route: PaperRoute;
  agentId?: string;
  noteId?: string;
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
  if (head === 'agent' && rest) return { route: 'agent', agentId: rest };
  if (head === 'notes' && rest) return { route: 'notes', noteId: rest };
  const ids = new Set(NAV.map((n) => n.id));
  ids.add('home');
  ids.add('notes');
  if (head && ids.has(head as PaperRoute)) return { route: head as PaperRoute };
  return { route: 'home' };
}

export function hrefFor(route: PaperRoute, id?: string): string {
  if (route === 'agent' && id) return `#/agent/${id}`;
  if (route === 'notes' && id) return `#/notes/${id}`;
  if (route === 'home') return '#/';
  return `#/${route}`;
}
