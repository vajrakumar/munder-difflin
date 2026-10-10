/** Archived agents (MDF-22): list, reopen, delete permanently. Route:
 *  `#/agents/archived`. Stop vs Archive lives on the sidebar and the room. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArchiveRestore, Search, Trash2 } from 'lucide-react';
import {
  Avatar, Badge, Button, Dialog, DialogContent, EmptyState, Input, Kbd, Skeleton,
  Table, TBody, TD, TH, THead, TR, ToastProvider, useToast
} from '@/ui';
import { agentName, deleteAgent, reopenAgent, useFloor } from '../../data/hive';
import { fullStamp, relative } from '../../data/time';
import type { PaperRoute } from '../../routes';
import { copyFor, currentLang } from './copy';
import { archivedRows, confirmDelete, filterRows, type ArchivedRow } from './model';
import '../../common/common.css';
import './archived.css';

export const route: PaperRoute = 'archived';

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

export function Screen(): JSX.Element {
  return (
    <ToastProvider>
      <ArchivedScreen />
    </ToastProvider>
  );
}

function ArchivedScreen(): JSX.Element {
  const lang = currentLang();
  const t = useMemo(() => copyFor(lang), [lang]);
  const floor = useFloor();
  const toast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [deleting, setDeleting] = useState<ArchivedRow | null>(null);
  const [typed, setTyped] = useState('');

  const rows = useMemo(() => archivedRows(floor.agents, floor.tasks), [floor.agents, floor.tasks]);
  const visible = useMemo(() => filterRows(rows, query), [rows, query]);
  const sel = visible[Math.min(selected, Math.max(0, visible.length - 1))];

  useEffect(() => {
    setSelected((i) => Math.min(i, Math.max(0, visible.length - 1)));
  }, [visible.length]);

  const reopen = useCallback(async (row: ArchivedRow | undefined, fresh = false) => {
    if (!row) return;
    const ok = await reopenAgent(row.id, fresh || row.worktreeMissing);
    toast(ok ? t.reopened(row.name) : t.error);
  }, [t, toast]);

  const remove = useCallback(async () => {
    if (!deleting || !confirmDelete(typed, deleting.name)) return;
    const name = deleting.name;
    const ok = await deleteAgent(deleting.id);
    setDeleting(null);
    setTyped('');
    toast(ok ? t.deleted(name) : t.error);
  }, [deleting, typed, t, toast]);

  useEffect(() => {
    if (deleting) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSelected((i) => Math.min(visible.length - 1, i + 1)); }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSelected((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); void reopen(sel, sel?.worktreeMissing); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, visible.length, sel, reopen]);

  if (!floor.loaded) {
    return (
      <div className="pc-screen par-root" aria-busy="true" aria-label={t.loading}>
        <div className="par-skel">
          <Skeleton /><Skeleton /><Skeleton /><Skeleton />
        </div>
      </div>
    );
  }

  if (floor.error) {
    return (
      <div className="pc-screen par-root">
        <EmptyState title={t.error} description={floor.error} action={<Button onClick={() => window.location.reload()}>{t.retry}</Button>} />
      </div>
    );
  }

  return (
    <div className="pc-screen par-root">
      <header className="par-toolbar">
        <div>
          <h1>{t.title}</h1>
          <p className="par-lede">
            <span className="pc-mode" data-mode={floor.mode}>
              <span className="pc-dot" />
              {floor.mode === 'live' ? t.live : t.demo}
            </span>
            {t.subtitle}
          </p>
        </div>
        <div className="par-search">
          <Search size={14} aria-hidden="true" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder={t.searchPlaceholder}
            aria-label={t.search}
          />
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? t.empty.title : t.emptyFiltered.title}
          description={rows.length === 0 ? t.empty.body : t.emptyFiltered.body}
        />
      ) : (
        <div className="par-table-wrap">
          <Table>
            <THead>
              <TR>
                <TH>{t.cols.name}</TH>
                <TH>{t.cols.archived}</TH>
                <TH>{t.cols.last}</TH>
                <TH>{t.cols.disk}</TH>
                <TH>{t.cols.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((row, i) => (
                <TR
                  key={row.id}
                  data-selected={sel?.id === row.id ? 'true' : undefined}
                  onClick={() => setSelected(i)}
                >
                  <TD>
                    <div className="par-name">
                      <Avatar name={row.name} size="sm" />
                      <div className="par-name-copy">
                        <strong>{row.name}</strong>
                        <div className="par-role">{row.role || row.id}</div>
                        {row.worktreeMissing ? (
                          <div className="par-warn">
                            <Badge tone="danger">{t.missing}</Badge>
                            {t.missingBody}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {row.archivedAt ? (
                      <span className="pc-key" title={fullStamp(row.archivedAt)}>{relative(row.archivedAt)}</span>
                    ) : t.never}
                  </TD>
                  <TD>
                    {row.lastTask ? (
                      <a className="pc-key" href={`#/tasks/${encodeURIComponent(row.lastTask.key)}`}>
                        {row.lastTask.key}
                      </a>
                    ) : t.never}
                    {row.lastTask?.title ? ` ${row.lastTask.title}` : ''}
                  </TD>
                  <TD className="pc-key">{row.diskUsed}</TD>
                  <TD>
                    <div className="par-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); void reopen(row, row.worktreeMissing); }}
                      >
                        <ArchiveRestore size={14} />
                        {row.worktreeMissing ? t.reopenFresh : t.reopen}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => { e.stopPropagation(); setDeleting(row); setTyped(''); }}
                      >
                        <Trash2 size={14} />
                        {t.remove}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <p className="par-keys">
        <span>j / k<Kbd>{t.keys.move}</Kbd></span>
        <span>Enter<Kbd>{t.keys.open}</Kbd></span>
        <span>/<Kbd>{t.keys.search}</Kbd></span>
        <span>{agentName(floor.agents, sel?.id)}</span>
      </p>

      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) { setDeleting(null); setTyped(''); } }}>
        {deleting ? (
          <DialogContent title={t.deleteTitle(deleting.name)} description={t.deleteBody(deleting.name)}>
            <Input
              className="par-dialog-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t.deletePrompt}
              aria-label={t.deletePrompt}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') void remove(); }}
            />
            <div className="par-dialog-actions">
              <Button variant="secondary" onClick={() => { setDeleting(null); setTyped(''); }}>{t.cancel}</Button>
              <Button variant="danger" disabled={!confirmDelete(typed, deleting.name)} onClick={() => void remove()}>
                {t.confirmDelete}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
