import { useEffect, useMemo, useRef, useState } from 'react';
import { Kbd } from '@/ui';
import { defaultActions, filterActions, highlightMatch, type PaperAction } from './actions';

const RECENT_KEY = 'paper.paletteRecent';

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string): void {
  const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
}

export function CommandPalette({
  open,
  onOpenChange,
  extra = []
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extra?: PaperAction[];
}): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const actions = useMemo(() => [...defaultActions(), ...extra], [extra]);
  const shown = useMemo(() => filterActions(actions, query, readRecent()), [actions, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = window.setTimeout(() => input.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function run(a: PaperAction): void {
    pushRecent(a.id);
    onOpenChange(false);
    a.run();
  }

  const groups = shown.reduce<Array<{ name: string; items: PaperAction[] }>>((acc, a) => {
    const last = acc[acc.length - 1];
    if (last && last.name === a.group) last.items.push(a);
    else acc.push({ name: a.group, items: [a] });
    return acc;
  }, []);

  let index = -1;

  return (
    <div className="paper-palette-root">
      <button
        type="button"
        className="paper-overlay paper-palette-scrim"
        tabIndex={-1}
        aria-label="Close palette"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="paper-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false); }
          if (e.key === 'Tab') {
            e.preventDefault();
            input.current?.focus();
          }
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
          if (e.key === 'Enter') {
            e.preventDefault();
            const a = shown[active];
            if (a) run(a);
          }
        }}
      >
        <input
          ref={input}
          className="paper-palette-input"
          placeholder="Search or jump…"
          aria-label="Search or jump"
          role="combobox"
          aria-expanded="true"
          aria-controls="paper-palette-list"
          aria-activedescendant={shown[active] ? `paper-pal-${shown[active].id}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div id="paper-palette-list" className="paper-palette-list" role="listbox">
          {shown.length === 0 ? (
            <div className="paper-palette-empty">No matching actions</div>
          ) : (
            groups.map((g) => (
              <div key={g.name} role="group" aria-label={g.name}>
                <div className="paper-palette-group">{g.name}</div>
                {g.items.map((a) => {
                  index += 1;
                  const i = index;
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      id={`paper-pal-${a.id}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      tabIndex={-1}
                      className="paper-palette-item"
                      data-active={i === active ? 'true' : undefined}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(a)}
                    >
                      {Icon ? <Icon size={16} className="paper-palette-ico" aria-hidden="true" /> : null}
                      <span className="paper-palette-label">
                        {highlightMatch(a.label, query).map((p, k) => (
                          p.hit ? <b key={k}>{p.text}</b> : <span key={k}>{p.text}</span>
                        ))}
                      </span>
                      {a.shortcut ? (
                        <span className="paper-palette-keys">
                          {a.shortcut.split(' ').map((k) => <Kbd key={k}>{k}</Kbd>)}
                        </span>
                      ) : a.hint ? <span className="paper-palette-hint">{a.hint}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="paper-palette-foot" aria-hidden="true">
          <span>↑↓ to move</span>
          <span>↵ to run</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPaletteHotkey(onToggle: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle]);
}
