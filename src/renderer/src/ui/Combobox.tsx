import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useMemo, useState } from 'react';
import { Input } from './Input';

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  'aria-label': ariaLabel
}: {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);
  const activeId = filtered[active] ? `paper-cb-opt-${filtered[active].value}` : undefined;

  function pick(v: string): void {
    onChange?.(v);
    setOpen(false);
    setQuery('');
    setActive(0);
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setActive(0);
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="paper-select-trigger"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected?.label ?? placeholder}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="paper-combobox-list" align="start" sideOffset={6}>
          <Input
            autoFocus
            value={query}
            placeholder={placeholder}
            aria-label={ariaLabel ? `${ariaLabel} filter` : 'Filter options'}
            aria-controls="paper-cb-list"
            aria-activedescendant={activeId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            style={{ width: '100%', marginBottom: 4 }}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const o = filtered[active];
                if (o) pick(o.value);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
          <div id="paper-cb-list" role="listbox" aria-label={ariaLabel ?? 'Options'}>
            {filtered.map((o, i) => (
              <div
                key={o.value}
                id={`paper-cb-opt-${o.value}`}
                role="option"
                aria-selected={o.value === value || i === active}
                className="paper-combobox-item"
                data-highlighted={i === active ? 'true' : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o.value);
                }}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 ? (
              <div className="paper-combobox-item" style={{ color: 'var(--paper-text-muted)' }}>
                No matches
              </div>
            ) : null}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
