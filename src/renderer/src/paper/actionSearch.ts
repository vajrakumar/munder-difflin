export type SearchableAction = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
};

function wordsOf(s: string): string[] {
  return s.toLowerCase().split(/[\s/._:-]+/).filter(Boolean);
}

function wordStarts(hay: string, q: string): boolean {
  return wordsOf(hay).some((w) => w.startsWith(q));
}

/** Rank by word starts. Short queries do not match mid-word (so "mem" skips "New note"). */
export function filterActions<T extends SearchableAction>(
  actions: T[],
  query: string,
  recent: string[] = []
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const id of recent) {
      const a = actions.find((x) => x.id === id);
      if (a && !seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
    for (const a of actions) {
      if (!seen.has(a.id)) out.push(a);
    }
    return out;
  }
  const scored = actions.map((a) => {
    const label = a.label.toLowerCase();
    let score = 0;
    if (label.startsWith(q) || wordsOf(a.label)[0]?.startsWith(q)) score = 100;
    else if (wordStarts(a.label, q)) score = 80;
    else if (wordStarts(a.keywords ?? '', q) || wordStarts(a.group, q)) score = 50;
    else if (q.length >= 4 && (label.includes(q) || (a.keywords ?? '').toLowerCase().includes(q))) score = 20;
    return { a, score };
  }).filter((x) => x.score > 0);
  scored.sort((x, y) => y.score - x.score || x.a.label.localeCompare(y.a.label));
  return scored.map((x) => x.a);
}

export function highlightMatch(label: string, query: string): Array<{ text: string; hit: boolean }> {
  const q = query.trim();
  if (!q) return [{ text: label, hit: false }];
  const i = label.toLowerCase().indexOf(q.toLowerCase());
  if (i >= 0) {
    return [
      { text: label.slice(0, i), hit: false },
      { text: label.slice(i, i + q.length), hit: true },
      { text: label.slice(i + q.length), hit: false }
    ].filter((p) => p.text);
  }
  const parts: Array<{ text: string; hit: boolean }> = [];
  const lower = q.toLowerCase();
  for (const raw of label.split(/(\s+)/)) {
    if (/^\s+$/.test(raw)) {
      parts.push({ text: raw, hit: false });
      continue;
    }
    if (raw.toLowerCase().startsWith(lower)) {
      parts.push({ text: raw.slice(0, q.length), hit: true });
      parts.push({ text: raw.slice(q.length), hit: false });
    } else {
      parts.push({ text: raw, hit: false });
    }
  }
  return parts.filter((p) => p.text);
}
