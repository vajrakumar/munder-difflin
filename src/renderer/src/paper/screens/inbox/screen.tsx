/** Unified Inbox (MDF-15): questions on ASK ME cards, mail between agents,
 *  outside messages (Slack, webhooks) and team messages in one place.
 *  Three columns: folders, list, detail. Keyboard triage: j/k, e, r, u, /. */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Archive, ArchiveRestore, ArrowLeft, Bot, CircleHelp, CornerDownLeft, Globe, Inbox as InboxIcon,
  Layers, MailOpen, Mail, Search, Users, X
} from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, IconButton, Kbd, StatusRing, Tooltip, cx } from '@/ui';
import { RichText, listOptions } from '../../common/RichText';
import { agentName, answerQuestion, dismissQuestion, HUMAN_ID, replyTo, sendMail, useFloor } from '../../data/hive';
import { isHuman, isOutside, outsideLabel, type PaperAgent, type PaperMail } from '../../data/model';
import { dayLabel, fullStamp, relative, shortStamp } from '../../data/time';
import { useViewerSet } from '../../data/viewerSet';
import type { PaperRoute } from '../../routes';
import { COPY, ACT_LABEL } from './copy';
import {
  buildItems, inFolder, involves, isDone, matches, PRIMARY_FOLDERS,
  type AskItem, type Folder, type InboxItem, type ThreadItem
} from './model';
import '../../common/common.css';
import './inbox.css';

export const route: PaperRoute = 'inbox';

const FOLDER_ICON: Record<Folder, typeof InboxIcon> = {
  needs: CircleHelp,
  agents: Bot,
  outside: Globe,
  team: Users,
  all: Layers,
  done: Archive
};

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable);
}

// ─── Sender avatar (agents get their ring; outside senders get a glyph) ────

function Sender({ id, agents, size = 'md' }: { id: string; agents: PaperAgent[]; size?: 'sm' | 'md' }): JSX.Element {
  if (isOutside(id)) {
    return (
      <span className={cx('pi-glyph', size === 'sm' && 'pi-glyph-sm')} aria-label={outsideLabel(id)} title={outsideLabel(id)}>
        <Globe size={size === 'sm' ? 11 : 14} />
      </span>
    );
  }
  if (isHuman(id)) {
    return <Avatar name="You" size={size} hue={264} />;
  }
  const a = agents.find((x) => x.id === id);
  const avatar = <Avatar name={a?.name ?? id} size={size} />;
  return a && size === 'md' ? <StatusRing status={a.status}>{avatar}</StatusRing> : avatar;
}

function nameFor(agents: PaperAgent[], id: string): string {
  if (isOutside(id)) return outsideLabel(id);
  if (isHuman(id)) return 'You';
  return agentName(agents, id);
}

// ─── Screen ────────────────────────────────────────────────────────────────

export function Screen(): JSX.Element {
  const floor = useFloor();
  const [folder, setFolder] = useState<Folder>('needs');
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [read, markRead] = useViewerSet('paper.inbox.read');
  const [done, markDone] = useViewerSet('paper.inbox.done');
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const nameOf = useCallback((id: string) => nameFor(floor.agents, id), [floor.agents]);
  const items = useMemo(() => buildItems(floor.tasks, floor.mail), [floor.tasks, floor.mail]);

  const counts = useMemo(() => {
    const c: Record<Folder, { total: number; unread: number }> = {
      needs: { total: 0, unread: 0 }, agents: { total: 0, unread: 0 }, outside: { total: 0, unread: 0 },
      team: { total: 0, unread: 0 }, all: { total: 0, unread: 0 }, done: { total: 0, unread: 0 }
    };
    for (const it of items) {
      for (const f of Object.keys(c) as Folder[]) {
        if (!inFolder(it, f, done)) continue;
        c[f].total++;
        if (!read.has(it.rev)) c[f].unread++;
      }
    }
    return c;
  }, [items, done, read]);

  const people = useMemo(() => {
    const tally = new Map<string, number>();
    for (const it of items) {
      if (isDone(it, done)) continue;
      const ids = it.kind === 'ask' ? [it.task.assignee ?? 'god'] : it.participants;
      ids.filter((id) => !isHuman(id) && !isOutside(id)).forEach((id) => tally.set(id, (tally.get(id) ?? 0) + 1));
    }
    return floor.agents
      .filter((a) => tally.has(a.id))
      .map((a) => ({ agent: a, count: tally.get(a.id) ?? 0 }))
      .sort((x, y) => y.count - x.count);
  }, [items, done, floor.agents]);

  const visible = useMemo(
    () => items.filter((it) => inFolder(it, folder, done)
      && (!agentFilter || involves(it, agentFilter))
      && matches(it, query.trim(), nameOf)),
    [items, folder, done, agentFilter, query, nameOf]
  );

  const selected = visible.find((it) => it.id === selectedId) ?? null;

  // Keep a selection while the list has rows; open the newest first.
  useEffect(() => {
    if (!visible.length) return;
    if (!selectedId || !visible.some((it) => it.id === selectedId)) setSelectedId(visible[0].id);
  }, [visible, selectedId]);

  useEffect(() => {
    if (selected && !read.has(selected.rev)) markRead([selected.rev], true);
  }, [selected, read, markRead]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const move = useCallback((delta: number) => {
    if (!visible.length) return;
    const i = Math.max(0, visible.findIndex((it) => it.id === selectedId));
    const next = visible[Math.min(visible.length - 1, Math.max(0, i + delta))];
    setSelectedId(next.id);
  }, [visible, selectedId]);

  const toggleDone = useCallback((item: InboxItem) => {
    if (item.kind === 'ask' && item.resolved) return;
    const wasDone = done.has(item.rev);
    if (!wasDone) {
      const i = visible.findIndex((it) => it.id === item.id);
      const next = visible[i + 1] ?? visible[i - 1];
      setSelectedId(next ? next.id : null);
    }
    markDone([item.rev], !wasDone);
  }, [done, markDone, visible]);

  const pickFolder = useCallback((f: Folder) => {
    setFolder(f);
    setSelectedId(null);
    setMobileDetail(false);
  }, []);

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTyping(e.target)) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
        listRef.current?.focus();
      }
      return;
    }
    const k = e.key;
    if (k === 'j' || k === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (k === 'k' || k === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (k === 'e' && selected) { e.preventDefault(); toggleDone(selected); }
    else if (k === 'u' && selected) { e.preventDefault(); markRead([selected.rev], !read.has(selected.rev)); }
    else if ((k === 'r' || k === 'Enter') && selected) {
      e.preventDefault();
      setMobileDetail(true);
      requestAnimationFrame(() => composerRef.current?.focus());
    }
    else if (k === '/') { e.preventDefault(); searchRef.current?.focus(); }
    else if (k === 'Escape') { setMobileDetail(false); listRef.current?.focus(); }
    else if (/^[1-4]$/.test(k)) { e.preventDefault(); pickFolder(PRIMARY_FOLDERS[Number(k) - 1]); }
  }, [move, selected, toggleDone, markRead, read, pickFolder]);

  // Group rows by day for the list.
  const groups = useMemo(() => {
    const out: Array<{ label: string; rows: InboxItem[] }> = [];
    for (const it of visible) {
      const label = dayLabel(it.at);
      const g = out[out.length - 1];
      if (g && g.label === label) g.rows.push(it);
      else out.push({ label, rows: [it] });
    }
    return out;
  }, [visible]);

  const folderTitle = COPY.folders[folder].label;

  return (
    <div className="pc-screen pi-root" ref={rootRef} onKeyDown={onKeyDown} data-detail={mobileDetail ? 'open' : undefined}>
      {/* ── Folders ─────────────────────────────────────────── */}
      <nav className="pi-rail" aria-label={COPY.railLabel}>
        <div className="pi-rail-head">
          <h1 className="pi-title">{COPY.title}</h1>
          <span className="pc-mode" data-mode={floor.mode} title={floor.mode === 'demo' ? COPY.demoHint : COPY.liveHint}>
            <span className="pc-dot" />
            {floor.mode === 'demo' ? COPY.demo : COPY.live}
          </span>
        </div>
        <div className="pi-folders">
          {(['needs', 'agents', 'outside', 'team'] as Folder[]).map((f, i) => (
            <FolderRow key={f} folder={f} active={folder === f} count={counts[f]} hotkey={String(i + 1)} onPick={pickFolder} />
          ))}
          <div className="pi-sep" role="presentation" />
          {(['all', 'done'] as Folder[]).map((f) => (
            <FolderRow key={f} folder={f} active={folder === f} count={counts[f]} onPick={pickFolder} />
          ))}
        </div>
        {people.length ? (
          <>
            <div className="pi-rail-label">{COPY.people}</div>
            <div className="pi-people">
              {people.map(({ agent, count }) => (
                <button
                  key={agent.id}
                  type="button"
                  className="pi-person"
                  aria-pressed={agentFilter === agent.id}
                  onClick={() => setAgentFilter((cur) => (cur === agent.id ? null : agent.id))}
                >
                  <StatusRing status={agent.status}><Avatar name={agent.name} size="sm" /></StatusRing>
                  <span className="pi-person-name">{agent.name}</span>
                  <span className="pi-count">{count}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className="pi-keys" aria-hidden="true">
          <span><Kbd>j</Kbd><Kbd>k</Kbd> {COPY.keys.move}</span>
          <span><Kbd>e</Kbd> {COPY.keys.done}</span>
          <span><Kbd>r</Kbd> {COPY.keys.reply}</span>
          <span><Kbd>/</Kbd> {COPY.keys.search}</span>
        </div>
      </nav>

      {/* ── List ────────────────────────────────────────────── */}
      <section className="pi-list" aria-label={folderTitle}>
        <header className="pi-list-head">
          <div className="pi-list-title">
            <h2>{folderTitle}</h2>
            <span className="pi-list-count">{visible.length}</span>
            {agentFilter ? (
              <button type="button" className="pi-chip" onClick={() => setAgentFilter(null)}>
                {COPY.with} {nameOf(agentFilter)}
                <X size={12} aria-label={COPY.clearFilter} />
              </button>
            ) : null}
          </div>
          <label className="pi-search">
            <Search size={14} aria-hidden="true" />
            <span className="pc-sr">{COPY.searchLabel}</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={COPY.searchPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.focus(); }
              }}
            />
            {query ? (
              <button type="button" className="pi-search-clear" onClick={() => setQuery('')} aria-label={COPY.clearSearch}>
                <X size={12} />
              </button>
            ) : <Kbd>/</Kbd>}
          </label>
        </header>
        <div
          ref={listRef}
          className="pi-rows"
          role="listbox"
          tabIndex={0}
          aria-label={folderTitle}
          aria-activedescendant={selected ? `pi-row-${selected.id}` : undefined}
        >
          {!floor.loaded ? <ListSkeleton /> : null}
          {floor.loaded && !visible.length ? <ListEmpty folder={folder} filtered={!!query || !!agentFilter} /> : null}
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div className="pi-day">{g.label}</div>
              {g.rows.map((it) => (
                <Row
                  key={it.id}
                  item={it}
                  agents={floor.agents}
                  selected={it.id === selected?.id}
                  unread={!read.has(it.rev)}
                  done={isDone(it, done)}
                  onSelect={() => { setSelectedId(it.id); setMobileDetail(true); }}
                  onToggleDone={() => toggleDone(it)}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Detail ──────────────────────────────────────────── */}
      <section className="pi-detail" aria-label={COPY.detailLabel}>
        {selected ? (
          <Detail
            key={selected.id}
            item={selected}
            agents={floor.agents}
            done={isDone(selected, done)}
            unread={!read.has(selected.rev)}
            composerRef={composerRef}
            onBack={() => { setMobileDetail(false); listRef.current?.focus(); }}
            onToggleDone={() => toggleDone(selected)}
            onToggleRead={() => markRead([selected.rev], !read.has(selected.rev))}
          />
        ) : (
          <EmptyState
            icon={<MailOpen size={28} aria-hidden="true" />}
            title={COPY.emptyDetail.title}
            description={COPY.emptyDetail.body}
          />
        )}
      </section>
    </div>
  );
}

// ─── Folder row ────────────────────────────────────────────────────────────

function FolderRow({
  folder, active, count, hotkey, onPick
}: {
  folder: Folder;
  active: boolean;
  count: { total: number; unread: number };
  hotkey?: string;
  onPick: (f: Folder) => void;
}): JSX.Element {
  const Icon = FOLDER_ICON[folder];
  const c = COPY.folders[folder];
  const n = folder === 'done' || folder === 'all' ? count.total : count.unread;
  return (
    <Tooltip content={hotkey ? <>{c.hint} · <span className="pi-tip-key">{hotkey}</span></> : c.hint}>
      <button
        type="button"
        className="pi-folder"
        aria-current={active ? 'page' : undefined}
        data-folder={folder}
        onClick={() => onPick(folder)}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="pi-folder-label">{c.label}</span>
        {n > 0 ? (
          <span className={cx('pi-count', folder === 'needs' && 'pi-count-urgent')} aria-label={`${n} ${folder === 'done' || folder === 'all' ? 'items' : 'unread'}`}>
            {n}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

// ─── List row ──────────────────────────────────────────────────────────────

function Row({
  item, agents, selected, unread, done, onSelect, onToggleDone
}: {
  item: InboxItem;
  agents: PaperAgent[];
  selected: boolean;
  unread: boolean;
  done: boolean;
  onSelect: () => void;
  onToggleDone: () => void;
}): JSX.Element {
  const who = item.kind === 'thread'
    ? `${nameFor(agents, item.last.from)} → ${nameFor(agents, item.last.to)}`
    : nameFor(agents, item.from);
  const count = item.kind === 'thread' ? item.mails.length : 0;
  return (
    <div
      id={`pi-row-${item.id}`}
      data-id={item.id}
      role="option"
      aria-selected={selected}
      className="pi-row"
      data-unread={unread || undefined}
      data-kind={item.kind}
      onClick={onSelect}
    >
      <span className="pi-row-dot" aria-label={unread ? COPY.unread : undefined} />
      <span className="pi-row-avatar"><Sender id={item.from} agents={agents} /></span>
      <span className="pi-row-main">
        <span className="pi-row-top">
          <span className="pi-row-who">{who}</span>
          {count > 1 ? <span className="pi-row-n" aria-label={`${count} ${COPY.messages}`}>{count}</span> : null}
          <time className="pi-row-time" dateTime={item.at} title={fullStamp(item.at)}>{shortStamp(item.at)}</time>
        </span>
        <span className="pi-row-subject">{item.subject}</span>
        <span className="pi-row-snippet">{item.snippet}</span>
        <span className="pi-row-tags">
          {item.kind === 'ask' && !item.resolved ? <Badge tone="danger">{COPY.question}</Badge> : null}
          {item.kind === 'ask' && item.resolved ? <Badge tone="success">{item.qa.a ? COPY.answered : COPY.dismissed}</Badge> : null}
          {item.kind === 'thread' && item.needsYou ? <Badge tone="warning">{COPY.needsReply}</Badge> : null}
          {item.kind === 'thread' ? <span className="pi-act" data-act={item.last.act}>{ACT_LABEL[item.last.act]}</span> : null}
          {item.kind === 'thread' && item.ticket ? <span className="pc-key">{item.ticket}</span> : null}
        </span>
      </span>
      {!(item.kind === 'ask' && item.resolved) ? (
        <span className="pi-row-actions">
          <IconButton
            size="sm"
            label={done ? COPY.undone : COPY.markDone}
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          >
            {done ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </IconButton>
        </span>
      ) : null}
    </div>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="pi-skel" aria-busy="true" aria-label={COPY.loading}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="pi-skel-row">
          <span className="paper-skel pi-skel-avatar" />
          <span className="pi-skel-lines">
            <span className="paper-skel" style={{ width: '40%' }} />
            <span className="paper-skel" style={{ width: '85%' }} />
            <span className="paper-skel" style={{ width: '65%' }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function ListEmpty({ folder, filtered }: { folder: Folder; filtered: boolean }): JSX.Element {
  const c = filtered ? COPY.emptyFiltered : COPY.empty[folder];
  const Icon = FOLDER_ICON[folder];
  return <EmptyState icon={<Icon size={24} aria-hidden="true" />} title={c.title} description={c.body} />;
}

// ─── Detail ────────────────────────────────────────────────────────────────

function Detail({
  item, agents, done, unread, composerRef, onBack, onToggleDone, onToggleRead
}: {
  item: InboxItem;
  agents: PaperAgent[];
  done: boolean;
  unread: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement>;
  onBack: () => void;
  onToggleDone: () => void;
  onToggleRead: () => void;
}): JSX.Element {
  const canArchive = !(item.kind === 'ask' && item.resolved);
  return (
    <div className="pi-detail-inner">
      <header className="pi-detail-head">
        <IconButton className="pi-back" label={COPY.back} onClick={onBack}><ArrowLeft size={16} /></IconButton>
        <div className="pi-detail-titles">
          <div className="pi-detail-meta">
            <Badge tone={item.lane === 'needs' ? 'danger' : item.lane === 'outside' ? 'accent' : 'neutral'}>
              {COPY.folders[item.lane].label}
            </Badge>
            {item.ticket ? (
              <a className="pc-key pi-ticket" href={`#/tasks/${encodeURIComponent(item.ticket)}`} title={COPY.openTicket}>
                {item.ticket}
              </a>
            ) : null}
            {item.kind === 'thread' ? (
              <span className="pi-detail-sub">
                {item.mails.length} {item.mails.length === 1 ? COPY.message : COPY.messages} · {item.participants.map((p) => nameFor(agents, p)).join(', ')}
              </span>
            ) : null}
          </div>
          <h2 className="pi-detail-title">{item.kind === 'ask' ? item.task.title : item.subject}</h2>
        </div>
        <div className="pi-detail-actions">
          <IconButton label={unread ? COPY.markRead : COPY.markUnread} onClick={onToggleRead}>
            {unread ? <MailOpen size={16} /> : <Mail size={16} />}
          </IconButton>
          {canArchive ? (
            <Tooltip content={<>{done ? COPY.undone : COPY.markDone} · <span className="pi-tip-key">e</span></>}>
              <Button size="sm" variant="secondary" onClick={onToggleDone}>
                {done ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                {done ? COPY.undone : COPY.done}
              </Button>
            </Tooltip>
          ) : null}
        </div>
      </header>
      {item.kind === 'ask'
        ? <AskDetail item={item} agents={agents} composerRef={composerRef} />
        : <ThreadDetail item={item} agents={agents} composerRef={composerRef} />}
    </div>
  );
}

function Composer({
  placeholder, submitLabel, composerRef, options, onSubmit, secondary
}: {
  placeholder: string;
  submitLabel: string;
  composerRef: React.RefObject<HTMLTextAreaElement>;
  options?: string[];
  onSubmit: (text: string) => Promise<boolean>;
  secondary?: JSX.Element;
}): JSX.Element {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const submit = async (): Promise<void> => {
    const body = text.trim();
    if (!body || state === 'sending') return;
    setState('sending');
    const ok = await onSubmit(body);
    setState(ok ? 'sent' : 'error');
    if (ok) setText('');
  };
  return (
    <div className="pi-composer">
      {options && options.length ? (
        <div className="pi-options" role="group" aria-label={COPY.quickAnswers}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className="pi-option"
              aria-pressed={text === o}
              onClick={() => { setText(o); composerRef.current?.focus(); }}
            >
              {o}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={composerRef}
        className="pc-textarea"
        rows={3}
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => { setText(e.target.value); if (state !== 'sending') setState('idle'); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
        }}
      />
      <div className="pi-composer-bar">
        <span className="pi-composer-status" role="status">
          {state === 'sent' ? COPY.sent : state === 'error' ? COPY.sendFailed : null}
        </span>
        {secondary}
        <Button size="sm" onClick={() => void submit()} disabled={!text.trim() || state === 'sending'}>
          {state === 'sending' ? COPY.sending : submitLabel}
          <Kbd className="pi-kbd-on-solid">⌘<CornerDownLeft size={10} /></Kbd>
        </Button>
      </div>
    </div>
  );
}

function AskDetail({ item, agents, composerRef }: { item: AskItem; agents: PaperAgent[]; composerRef: React.RefObject<HTMLTextAreaElement> }): JSX.Element {
  const { task } = item;
  const history = task.humanQA.filter((e) => e !== item.qa);
  const asker = task.assignee ?? 'god';
  return (
    <div className="pi-detail-body">
      <div className="pi-scroll">
        <div className="pi-card-ref">
          <span className="pc-key">{task.key}</span>
          <span className="pi-card-status" data-status={task.status}>{COPY.taskStatus[task.status]}</span>
          <span className="pi-card-owner">
            <Sender id={asker} agents={agents} size="sm" />
            {nameFor(agents, asker)}
          </span>
        </div>
        <article className="pi-ask">
          <div className="pi-ask-head">
            <CircleHelp size={16} aria-hidden="true" />
            <span>{item.resolved ? COPY.askClosed : COPY.askOpen}</span>
            {item.qa.askedAt ? <time dateTime={item.qa.askedAt} title={fullStamp(item.qa.askedAt)}>{relative(item.qa.askedAt)}</time> : null}
          </div>
          <RichText text={item.qa.q} />
          {item.qa.a ? (
            <div className="pi-answer">
              <span className="pi-answer-label">{COPY.yourAnswer}</span>
              <RichText text={item.qa.a} />
            </div>
          ) : null}
          {item.qa.dismissedAt && !item.qa.a ? <p className="pi-muted">{COPY.dismissedNote}</p> : null}
        </article>
        {history.length ? (
          <details className="pi-history">
            <summary>{COPY.earlierQuestions(history.length)}</summary>
            <ol>
              {history.map((e, i) => (
                <li key={i}>
                  <RichText text={e.q} />
                  <p className="pi-muted">{e.a ? `${COPY.answeredWith} ${e.a}` : e.dismissedAt ? COPY.dismissed : COPY.open}</p>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
      {!item.resolved ? (
        <Composer
          composerRef={composerRef}
          placeholder={COPY.answerPlaceholder}
          submitLabel={COPY.sendAnswer}
          options={listOptions(item.qa.q)}
          onSubmit={(text) => answerQuestion(task, text)}
          secondary={(
            <Button size="sm" variant="ghost" onClick={() => void dismissQuestion(task)}>{COPY.dismiss}</Button>
          )}
        />
      ) : null}
    </div>
  );
}

function ThreadDetail({ item, agents, composerRef }: { item: ThreadItem; agents: PaperAgent[]; composerRef: React.RefObject<HTMLTextAreaElement> }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const mails = item.mails;
  const hidden = !expanded && mails.length > 3 ? mails.length - 3 : 0;
  const shown = hidden ? [mails[0], ...mails.slice(-2)] : mails;
  const outside = isOutside(item.last.from) || isOutside(mails[0].from);
  const target = outside ? 'god' : (isHuman(item.last.from) ? item.last.to : item.last.from);
  const placeholder = outside
    ? COPY.replyOutside(outsideLabel(mails[0].from), agentName(agents, 'god'))
    : `${COPY.replyTo} ${nameFor(agents, target)}…`;
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [mails.length]);

  const submit = (text: string): Promise<boolean> => {
    if (!outside) return replyTo(item.last, text);
    return sendMail({
      to: 'god',
      act: 'request',
      subject: `Reply to ${outsideLabel(mails[0].from)}: ${item.subject}`,
      body: `Please send this reply to ${outsideLabel(mails[0].from)} on my behalf:\n\n${text}`,
      conversation: item.last.conversation,
      inReplyTo: item.last.id
    });
  };

  return (
    <div className="pi-detail-body">
      <div className="pi-scroll">
        <ol className="pi-thread">
          {shown.map((m, i) => (
            <li key={m.id}>
              {hidden && i === 1 ? (
                <button type="button" className="pi-more" onClick={() => setExpanded(true)}>
                  {COPY.earlier(hidden)}
                </button>
              ) : null}
              <Letter mail={m} agents={agents} />
            </li>
          ))}
        </ol>
        <div ref={bottom} />
      </div>
      <Composer
        composerRef={composerRef}
        placeholder={placeholder}
        submitLabel={COPY.send}
        options={item.needsYou && !isHuman(item.last.from) ? listOptions(item.last.body) : undefined}
        onSubmit={submit}
      />
    </div>
  );
}

function Letter({ mail, agents }: { mail: PaperMail; agents: PaperAgent[] }): JSX.Element {
  const mine = mail.from === HUMAN_ID;
  return (
    <article className="pi-letter" data-mine={mine || undefined}>
      <header className="pi-letter-head">
        <Sender id={mail.from} agents={agents} />
        <div className="pi-letter-who">
          <span className="pi-letter-from">{nameFor(agents, mail.from)}</span>
          <span className="pi-letter-to">{COPY.to} {nameFor(agents, mail.to)}</span>
        </div>
        <span className="pi-act" data-act={mail.act}>{ACT_LABEL[mail.act]}</span>
        <time dateTime={mail.createdAt} title={fullStamp(mail.createdAt)} className="pi-letter-time">{relative(mail.createdAt)}</time>
      </header>
      {mail.subject && !/^re:/i.test(mail.subject) ? <h3 className="pi-letter-subject">{mail.subject}</h3> : null}
      <RichText text={mail.body} />
    </article>
  );
}
