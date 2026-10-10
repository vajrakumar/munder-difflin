/** Tasks (MDF-16): board, list and timeline. Ticket keys, owner/status/date
 *  filters, dependency chips and lines, detail in a side sheet. Deep link
 *  `#/tasks/MDF-16`. New cards still enter through the god; this surface
 *  patches status, assignee, priority and ASK ME answers. */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import {
  Avatar, Badge, Button, EmptyState, Input, Sheet, SheetContent, Table, TBody, TD, TH, THead, TR
} from '@/ui';
import { RichText } from '../../common/RichText';
import { agentName, answerQuestion, dismissQuestion, patchTask, useFloor } from '../../data/hive';
import { openQuestion, type PaperTask, type TaskPriority, type TaskStatus } from '../../data/model';
import { fullStamp, relative } from '../../data/time';
import { hrefFor, parseHash, type PaperRoute } from '../../routes';
import {
  COLUMNS, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE, VIEWS,
  axis, depEdges, filterTasks, groupTimeline, indexById, ownersFrom, pct, readView, sortList, span, ticks,
  waitingOn, writeView, type DateFilter, type OwnerFilter, type StatusFilter, type View
} from './model';
import '../../common/common.css';
import './tasks.css';

export const route: PaperRoute = 'tasks';

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

function useTaskId(): string | undefined {
  const [id, setId] = useState(() => parseHash(window.location.hash).taskId);
  useEffect(() => {
    const on = (): void => setId(parseHash(window.location.hash).taskId);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return id;
}

function openTask(t: PaperTask): void {
  window.location.hash = hrefFor('tasks', t.key);
}

function closeSheet(): void {
  window.location.hash = hrefFor('tasks');
}

export function Screen(): JSX.Element {
  const floor = useFloor();
  const taskId = useTaskId();
  const [view, setView] = useState<View>(readView);
  const [owner, setOwner] = useState<OwnerFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [date, setDate] = useState<DateFilter>('any');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const didDrag = useRef(false);

  const nameOf = useCallback((id: string | undefined) => agentName(floor.agents, id), [floor.agents]);
  const index = useMemo(() => indexById(floor.tasks), [floor.tasks]);
  const visible = useMemo(
    () => filterTasks(floor.tasks, { owner, status, date, query, nameOf }),
    [floor.tasks, owner, status, date, query, nameOf]
  );
  const listed = useMemo(() => sortList(visible), [visible]);
  const owners = useMemo(() => ownersFrom(floor.tasks, floor.agents), [floor.tasks, floor.agents]);
  const open = floor.tasks.find((t) => t.id === taskId || t.key === taskId);

  useEffect(() => { writeView(view); }, [view]);
  useEffect(() => {
    if (open) setSelectedId(open.id);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === '1') { setView('board'); return; }
      if (e.key === '2') { setView('list'); return; }
      if (e.key === '3') { setView('timeline'); return; }
      if (open) return;
      if (e.key !== 'j' && e.key !== 'k' && e.key !== 'Enter') return;
      if (!listed.length) return;
      const i = Math.max(0, listed.findIndex((t) => t.id === selectedId));
      if (e.key === 'j') {
        const next = listed[Math.min(listed.length - 1, (selectedId ? i : -1) + 1)];
        setSelectedId(next.id);
      } else if (e.key === 'k') {
        const next = listed[Math.max(0, (selectedId ? i : 0) - 1)];
        setSelectedId(next.id);
      } else if (e.key === 'Enter' && selectedId) {
        const t = listed.find((x) => x.id === selectedId);
        if (t) openTask(t);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listed, open, selectedId]);

  const counts = useMemo(() => {
    const c: Record<TaskStatus, number> = { todo: 0, doing: 0, blocked: 0, done: 0 };
    for (const t of visible) c[t.status]++;
    return c;
  }, [visible]);

  function dropOn(col: TaskStatus, e: DragEvent): void {
    e.preventDefault();
    setOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    const t = floor.tasks.find((x) => x.id === id);
    if (t && t.status !== col) void patchTask(t.id, { status: col });
  }

  const filtered = owner !== 'all' || status !== 'all' || date !== 'any' || query.trim().length > 0;

  return (
    <div className="pc-screen pt-root">
      <header className="pt-toolbar">
        <div className="pt-toolbar-top">
          <div>
            <h1>Tasks</h1>
            <p className="pt-lede">
              <span className="pc-mode" data-mode={floor.mode}>
                <span className="pc-dot" />
                {floor.mode === 'live' ? 'Live' : 'Demo'}
              </span>
              <span>{visible.length} of {floor.tasks.length} cards</span>
              <span>{counts.doing} doing · {counts.blocked} blocked</span>
            </p>
          </div>
          <div className="pt-views" role="group" aria-label="Task view">
            {VIEWS.map((id) => (
              <Button
                key={id}
                size="sm"
                variant={view === id ? 'primary' : 'secondary'}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {id === 'board' ? 'Board' : id === 'list' ? 'List' : 'Timeline'}
              </Button>
            ))}
          </div>
        </div>
        <div className="pt-filters">
          <div className="pt-search">
            <Search size={14} aria-hidden="true" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter tickets"
              aria-label="Filter tickets"
            />
          </div>
          <select
            className="paper-input pt-select"
            aria-label="Owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value as OwnerFilter)}
          >
            <option value="all">All owners</option>
            <option value="unassigned">Unassigned</option>
            {owners.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            className="paper-input pt-select"
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            {COLUMNS.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            className="paper-input pt-select"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value as DateFilter)}
          >
            <option value="any">Any time</option>
            <option value="today">Updated today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </header>
      <div className="pt-body">
        {!floor.loaded ? (
          <EmptyState title="Loading tasks" description="Reading the floor ledger." />
        ) : visible.length === 0 ? (
          <EmptyState
            title={floor.tasks.length === 0 ? 'No cards yet' : 'No cards match'}
            description={filtered ? 'Clear filters to see the board.' : 'The god writes new work onto the ledger.'}
            action={filtered ? (
              <Button size="sm" variant="secondary" onClick={() => { setOwner('all'); setStatus('all'); setDate('any'); setQuery(''); }}>
                Clear filters
              </Button>
            ) : undefined}
          />
        ) : view === 'board' ? (
          <Board
            tasks={visible}
            index={index}
            nameOf={nameOf}
            currentId={open?.id ?? selectedId}
            overCol={overCol}
            onOver={setOverCol}
            onOpen={(t) => {
              if (didDrag.current) { didDrag.current = false; return; }
              openTask(t);
            }}
            onDragStart={() => { didDrag.current = true; }}
            onDragEnd={() => { window.setTimeout(() => { didDrag.current = false; }, 0); }}
            onDrop={dropOn}
          />
        ) : view === 'list' ? (
          <List tasks={listed} index={index} nameOf={nameOf} currentId={open?.id ?? selectedId} />
        ) : (
          <Timeline tasks={visible} agents={floor.agents} index={index} nameOf={nameOf} currentId={open?.id ?? selectedId} />
        )}
      </div>
      <Sheet open={!!open} onOpenChange={(v) => { if (!v) closeSheet(); }}>
        {open ? <Detail task={open} index={index} agents={floor.agents} nameOf={nameOf} /> : null}
      </Sheet>
    </div>
  );
}

function Board({
  tasks, index, nameOf, currentId, overCol, onOver, onOpen, onDragStart, onDragEnd, onDrop
}: {
  tasks: PaperTask[];
  index: Map<string, PaperTask>;
  nameOf: (id: string | undefined) => string;
  currentId: string | null;
  overCol: TaskStatus | null;
  onOver: (col: TaskStatus | null) => void;
  onOpen: (t: PaperTask) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (col: TaskStatus, e: DragEvent) => void;
}): JSX.Element {
  return (
    <div className="pt-board">
      {COLUMNS.map((col) => {
        const cards = tasks.filter((t) => t.status === col);
        return (
          <section
            key={col}
            className="pt-col"
            data-status={col}
            data-over={overCol === col ? 'true' : 'false'}
            aria-label={`${STATUS_LABEL[col]}, ${cards.length} cards`}
            onDragOver={(e) => { e.preventDefault(); onOver(col); }}
            onDragLeave={() => onOver(null)}
            onDrop={(e) => onDrop(col, e)}
          >
            <header className="pt-col-head">
              <span className="pc-dot" aria-hidden="true" />
              {STATUS_LABEL[col]}
              <span className="pt-col-count">{cards.length}</span>
            </header>
            <div className="pt-col-body">
              {cards.map((t) => (
                <Card
                  key={t.id}
                  task={t}
                  index={index}
                  nameOf={nameOf}
                  current={t.id === currentId}
                  onOpen={() => onOpen(t)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({
  task, index, nameOf, current, onOpen, onDragStart, onDragEnd
}: {
  task: PaperTask;
  index: Map<string, PaperTask>;
  nameOf: (id: string | undefined) => string;
  current: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}): JSX.Element {
  const wait = waitingOn(task, index);
  const ask = openQuestion(task);
  return (
    <button
      type="button"
      className="pt-card"
      data-status={task.status}
      aria-current={current || undefined}
      draggable
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="pt-card-top">
        <span className="pc-key">{task.key}</span>
        {task.priority !== 'medium' ? (
          <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        ) : null}
        {ask ? <Badge tone="danger">Asked you</Badge> : null}
      </div>
      <p className="pt-card-title">{task.title}</p>
      <div className="pt-card-meta">
        {task.assignee ? <Avatar name={nameOf(task.assignee)} size="sm" /> : null}
        {task.size ? <Badge>{task.size}</Badge> : null}
        {task.phase ? <Badge>{task.phase}</Badge> : null}
        {task.deps.length ? (
          <span className="pt-deps">
            {task.deps.map((id) => {
              const d = index.get(id);
              const openDep = d ? d.status !== 'done' : true;
              return (
                <span key={id} className="pt-dep" data-open={openDep ? 'true' : 'false'} title={d?.title ?? id}>
                  {d?.key ?? id}
                </span>
              );
            })}
          </span>
        ) : null}
        {wait.length ? (
          <span className="pt-hint">Waiting on {wait.map((d) => d.key).join(', ')}</span>
        ) : null}
      </div>
    </button>
  );
}

function List({
  tasks, index, nameOf, currentId
}: {
  tasks: PaperTask[];
  index: Map<string, PaperTask>;
  nameOf: (id: string | undefined) => string;
  currentId: string | null;
}): JSX.Element {
  return (
    <div className="pt-table-wrap">
      <Table className="pt-table">
        <THead>
          <TR>
            <TH>Key</TH>
            <TH>Title</TH>
            <TH>Status</TH>
            <TH>Owner</TH>
            <TH>Priority</TH>
            <TH>Depends</TH>
            <TH>Updated</TH>
          </TR>
        </THead>
        <TBody>
          {tasks.map((t) => (
            <TR
              key={t.id}
              tabIndex={0}
              aria-current={t.id === currentId || undefined}
              onClick={() => openTask(t)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(t); }
              }}
            >
              <TD><span className="pc-key">{t.key}</span></TD>
              <TD>{t.title}</TD>
              <TD><Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge></TD>
              <TD>
                {t.assignee ? (
                  <span className="pt-owner">
                    <Avatar name={nameOf(t.assignee)} size="sm" />
                    <span className="pt-owner-name">{nameOf(t.assignee)}</span>
                  </span>
                ) : <span className="pt-hint">Unassigned</span>}
              </TD>
              <TD><Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge></TD>
              <TD>
                {t.deps.length ? t.deps.map((id) => index.get(id)?.key ?? id).join(', ') : '—'}
              </TD>
              <TD>
                <time dateTime={t.updatedAt ?? t.createdAt} title={fullStamp(t.updatedAt ?? t.createdAt)}>
                  {relative(t.updatedAt ?? t.createdAt)}
                </time>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function Timeline({
  tasks, agents, index, nameOf, currentId
}: {
  tasks: PaperTask[];
  agents: ReturnType<typeof useFloor>['agents'];
  index: Map<string, PaperTask>;
  nameOf: (id: string | undefined) => string;
  currentId: string | null;
}): JSX.Element {
  const now = Date.now();
  const rows = useMemo(
    () => groupTimeline(tasks, agents, nameOf).flatMap((g) => g.tasks),
    [tasks, agents, nameOf]
  );
  const range = useMemo(() => axis(rows, now), [rows, now]);
  const marks = useMemo(() => ticks(range.start, range.end), [range]);
  const edges = useMemo(() => depEdges(rows, index, range.start, range.end, now), [rows, index, range, now]);
  const template = `32px repeat(${Math.max(rows.length, 1)}, 36px)`;

  return (
    <div className="pt-gantt" style={{ gridTemplateRows: template } as CSSProperties} role="region" aria-label="Task timeline">
      <div className="pt-gantt-corner">Ticket</div>
      <div className="pt-gantt-axis">
        {marks.map((m) => (
          <span
            key={m.t}
            className="pt-tick"
            style={{ insetInlineStart: `${pct(m.t, range.start, range.end)}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      {rows.map((t, i) => (
        <button
          key={t.id}
          type="button"
          className="pt-gantt-id"
          style={{ gridRow: i + 2 }}
          aria-current={t.id === currentId || undefined}
          onClick={() => openTask(t)}
        >
          {t.assignee ? <Avatar name={nameOf(t.assignee)} size="sm" /> : null}
          <span className="pc-key">{t.key}</span>
          <span className="pt-gantt-title">{t.title}</span>
        </button>
      ))}
      <div className="pt-gantt-stack">
        {marks.map((m) => (
          <span
            key={m.t}
            className="pt-gridline"
            style={{ insetInlineStart: `${pct(m.t, range.start, range.end)}%` }}
          />
        ))}
        <svg className="pt-deps-svg" aria-hidden="true">
          {edges.map((e) => (
            <line key={`${e.from}-${e.to}`} x1={`${e.x1}%`} y1={`${e.y1}%`} x2={`${e.x2}%`} y2={`${e.y2}%`} />
          ))}
        </svg>
        {rows.map((t, i) => {
          const s = span(t, now);
          const x = pct(s.start, range.start, range.end);
          const w = Math.max(s.point ? 0 : pct(s.end, range.start, range.end) - x, 0);
          const top = s.point ? i * 36 + 13 : i * 36 + 8;
          return (
            <button
              key={t.id}
              type="button"
              className="pt-span"
              data-status={t.status}
              data-point={s.point ? 'true' : 'false'}
              aria-label={`${t.key} ${STATUS_LABEL[t.status]}`}
              style={{ top, '--pt-x': `${x}%`, '--pt-w': s.point ? '10px' : `${Math.max(w, 0.8)}%` } as CSSProperties}
              onClick={() => openTask(t)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Detail({
  task, index, agents, nameOf
}: {
  task: PaperTask;
  index: Map<string, PaperTask>;
  agents: ReturnType<typeof useFloor>['agents'];
  nameOf: (id: string | undefined) => string;
}): JSX.Element {
  const [answer, setAnswer] = useState('');
  const ask = openQuestion(task);
  useEffect(() => { setAnswer(''); }, [task.id]);

  function submit(e: FormEvent): void {
    e.preventDefault();
    void answerQuestion(task, answer).then((ok) => { if (ok) setAnswer(''); });
  }

  return (
    <SheetContent title={task.key} className="paper-sheet-wide">
      <p className="pt-sheet-title">{task.title}</p>
      <div className="pt-fields">
        <label className="pt-field">
          <span className="pt-label">Status</span>
          <select
            className="paper-input"
            aria-label="Status"
            value={task.status}
            onChange={(e) => void patchTask(task.id, { status: e.target.value as TaskStatus })}
          >
            {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="pt-field">
          <span className="pt-label">Priority</span>
          <select
            className="paper-input"
            aria-label="Priority"
            value={task.priority}
            onChange={(e) => void patchTask(task.id, { priority: e.target.value as TaskPriority })}
          >
            {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </label>
        <label className="pt-field pt-field-full">
          <span className="pt-label">Owner</span>
          <select
            className="paper-input"
            aria-label="Owner"
            value={task.assignee ?? ''}
            onChange={(e) => void patchTask(task.id, { assignee: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {agents.filter((a) => !a.archived).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      </div>
      {task.description ? (
        <div className="pt-section">
          <h3>Description</h3>
          <div className="pt-desc"><RichText text={task.description} /></div>
        </div>
      ) : null}
      {task.deps.length ? (
        <div className="pt-section">
          <h3>Depends on</h3>
          {task.deps.map((id) => {
            const d = index.get(id);
            return (
              <button
                key={id}
                type="button"
                className="pt-dep-row"
                onClick={() => { if (d) openTask(d); }}
                disabled={!d}
              >
                <span className="pc-key">{d?.key ?? id}</span>
                <span className="pt-gantt-title">{d?.title ?? 'Unknown card'}</span>
                {d ? <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {task.humanQA.length ? (
        <div className="pt-section">
          <h3>Questions</h3>
          <div className="pt-qa">
            {task.humanQA.map((qa, i) => {
              const isOpen = ask === qa;
              return (
                <div key={`${qa.askedAt ?? i}`} className="pt-qa-item" data-open={isOpen ? 'true' : 'false'}>
                  <p className="pt-qa-q"><RichText text={qa.q} /></p>
                  {qa.a ? <p className="pt-qa-a">{qa.a}</p> : null}
                  <p className="pt-qa-meta">
                    {qa.askedAt ? `Asked ${relative(qa.askedAt)}` : 'Asked'}
                    {qa.a && qa.answeredAt ? ` · answered ${relative(qa.answeredAt)}` : ''}
                    {qa.dismissedAt ? ` · dismissed ${relative(qa.dismissedAt)}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
          {ask ? (
            <form className="pt-answer" onSubmit={submit}>
              <textarea
                className="pc-textarea"
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Answer this question…"
                aria-label="Answer"
              />
              <div className="pt-answer-actions">
                <Button type="submit" size="sm" disabled={!answer.trim()}>Answer</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void dismissQuestion(task)}>
                  Dismiss
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
      <div className="pt-stamps">
        <span>Created {fullStamp(task.createdAt)}</span>
        {task.startedAt ? <span>Started {fullStamp(task.startedAt)}</span> : null}
        {task.completedAt ? <span>Completed {fullStamp(task.completedAt)}</span> : null}
        {task.updatedAt ? <span>Updated {fullStamp(task.updatedAt)}</span> : null}
        {task.assignee ? <span>Owner {nameOf(task.assignee)}</span> : null}
      </div>
    </SheetContent>
  );
}
