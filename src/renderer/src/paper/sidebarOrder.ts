export function moveId(ids: string[], fromId: string, beforeId: string | null): string[] {
  const next = ids.filter((id) => id !== fromId);
  if (beforeId == null) {
    next.push(fromId);
    return next;
  }
  const i = next.indexOf(beforeId);
  if (i < 0) {
    next.push(fromId);
    return next;
  }
  next.splice(i, 0, fromId);
  return next;
}

export function ensureOrder(ids: string[], known: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (known.includes(id) && !seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }
  for (const id of known) {
    if (!seen.has(id)) next.push(id);
  }
  return next;
}

export function groupByProject<T extends { id: string; projectId: string }>(
  items: T[],
  order: string[],
  projects: Array<{ id: string; name: string }>
): Array<{ project: { id: string; name: string }; items: T[] }> {
  const byId = new Map(items.map((a) => [a.id, a]));
  const ordered: T[] = [];
  for (const id of order) {
    const a = byId.get(id);
    if (a) ordered.push(a);
  }
  for (const a of items) {
    if (!order.includes(a.id)) ordered.push(a);
  }
  return projects
    .map((project) => ({
      project,
      items: ordered.filter((a) => a.projectId === project.id)
    }))
    .filter((g) => g.items.length > 0);
}
