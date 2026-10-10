/** Small, safe renderer for agent-written text: paragraphs, "-" and "1."
 *  lists, **bold**, *emphasis* and `code`. Builds React nodes only, never
 *  HTML strings, so nothing in a message can inject markup. */
import { Fragment, type ReactNode } from 'react';
import './common.css';

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;

export function inline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type Block = { kind: 'p' | 'ul' | 'ol'; lines: string[] };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const chunk of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    let cur: Block | null = null;
    for (const line of lines) {
      const kind: Block['kind'] = /^\s*[-*•]\s+/.test(line) ? 'ul' : /^\s*\d+[.)]\s+/.test(line) ? 'ol' : 'p';
      const body = kind === 'p' ? line : line.replace(/^\s*([-*•]|\d+[.)])\s+/, '');
      if (!cur || cur.kind !== kind) {
        cur = { kind, lines: [] };
        out.push(cur);
      }
      cur.lines.push(body);
    }
  }
  return out;
}

/** List items of a message, used to offer one-click answers to a question. */
export function listOptions(text: string): string[] {
  return blocks(text).filter((b) => b.kind !== 'p').flatMap((b) => b.lines)
    .map((l) => l.replace(/[`*]/g, '').trim()).filter((l) => l.length > 0 && l.length <= 120);
}

export function RichText({ text, className }: { text: string; className?: string }): JSX.Element {
  return (
    <div className={className ? `pc-rich ${className}` : 'pc-rich'}>
      {blocks(text).map((b, i) => {
        if (b.kind === 'ul') return <ul key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul>;
        if (b.kind === 'ol') return <ol key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ol>;
        return <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 ? <br /> : null}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
