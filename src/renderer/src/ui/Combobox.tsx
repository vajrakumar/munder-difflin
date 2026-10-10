import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useMemo, useState } from 'react';
import { Input } from './Input';

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Search…'
}: {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className="paper-select-trigger">
          {selected?.label ?? placeholder}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="paper-combobox-list" align="start" sideOffset={6}>
          <Input
            autoFocus
            value={query}
            placeholder={placeholder}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', marginBottom: 4 }}
          />
          {filtered.map((o) => (
            <div
              key={o.value}
              className="paper-combobox-item"
              data-highlighted={o.value === value ? true : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange?.(o.value);
                setOpen(false);
                setQuery('');
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
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
