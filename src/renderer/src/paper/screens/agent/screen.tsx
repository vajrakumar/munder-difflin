/** Agent room (MDF-13): one agent's live terminal on the left with a composer
 *  (attachments + image paste) pinned under it, and Overview, Messages and
 *  Tasks for that agent on the right. Route: #/agent/<id>.
 *
 *  Live (Electron): the terminal is the agent's pooled xterm (PtyTerminalView)
 *  and the composer queues into the agent's prompt like the classic composer.
 *  Demo (gallery): a static xterm and the composer posts to the floor mail. */
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { ImagePlus, Paperclip, Send, SquareTerminal, X } from 'lucide-react';
import {
  Avatar, Badge, Button, EmptyState, IconButton, StatusRing, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip, type BadgeTone
} from '@/ui';
import { useStore } from '@/store/store';
import { PtyTerminalView } from '@/components/PtyTerminalView';
import { TerminalView } from '@/components/TerminalView';
import { isComposingKey } from '@shared/imeGuard';
import { RichText } from '../../common/RichText';
import { agentName, sendMail, useFloor } from '../../data/hive';
import { isHuman, type PaperTask, type TaskStatus } from '../../data/model';
import { fullStamp, relative } from '../../data/time';
import { DEFAULT_AGENTS } from '../../demoData';
import { hrefFor, parseHash, type PaperRoute } from '../../routes';
import {
  compact, contextPct, demoInfo, demoTerminal, mailFor, tasksFor, withAttachments, type Attachment, type RoomInfo
} from './model';
import '../../common/common.css';
import './agent.css';

export const route: PaperRoute = 'agent';

const MAX_ATTACHMENTS = 8;

const STATUS_TONE: Record<TaskStatus, BadgeTone> = { doing: 'accent', blocked: 'danger', todo: 'neutral', done: 'success' };
const STATUS_LABEL: Record<TaskStatus, string> = { doing: 'Doing', blocked: 'Blocked', todo: 'To do', done: 'Done' };

function useAgentId(): string | undefined {
  const [id, setId] = useState(() => parseHash(window.location.hash).agentId);
  useEffect(() => {
    const on = (): void => setId(parseHash(window.location.hash).agentId);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return id;
}

function hasBridge(): boolean {
  return typeof (window as { cth?: { saveClipboardImage?: unknown } }).cth?.saveClipboardImage === 'function';
}

// ─── Screen ────────────────────────────────────────────────────────────────

export function Screen(): JSX.Element {
  const id = useAgentId();
  const floor = useFloor();
  const live = useStore((s) => (id ? s.agents.find((a) => a.id === id) : undefined));
  const rail = DEFAULT_AGENTS.find((a) => a.id === id);
  const fa = floor.agents.find((a) => a.id === id);

  const name = live?.name ?? fa?.name ?? rail?.name ?? id ?? 'Agent';
  const role = fa?.role ?? rail?.role;
  const status = fa?.status ?? rail?.status ?? 'idle';
  const info: RoomInfo = live
    ? { engine: live.provider, model: live.model, cwd: live.cwd, worktree: live.worktreePath, contextTokens: live.contextTokens, contextLimit: live.contextLimit }
    : floor.mode === 'demo' && id ? demoInfo(id) : {};

  const mail = useMemo(() => (id ? mailFor(floor.mail, id) : []), [floor.mail, id]);
  const tasks = useMemo(() => (id ? tasksFor(floor.tasks, id) : []), [floor.tasks, id]);
  const current = tasks.find((t) => t.status === 'doing') ?? tasks.find((t) => t.status === 'blocked');

  if (!id || (floor.loaded && !fa && !live && !rail)) {
    return (
      <div className="pc-screen pa-missing">
        <EmptyState title="No such agent" description="This agent is not on the floor. Pick one from the sidebar." />
      </div>
    );
  }

  return (
    <div className="pc-screen pa-root">
      <header className="pa-head">
        <StatusRing status={status}><Avatar name={name} /></StatusRing>
        <div className="pa-head-text">
          <h1 className="pa-title">{name}</h1>
          {role ? <p className="pa-role">{role}</p> : null}
        </div>
        <Badge tone={status === 'blocked' ? 'danger' : status === 'working' || status === 'thinking' ? 'accent' : 'neutral'}>{status}</Badge>
        {rail?.askedYou ? <Badge tone="danger">Asked you</Badge> : null}
        {current ? <Badge tone="accent">{current.key}</Badge> : null}
        <span className="pa-head-spacer" />
        {info.model ? <span className="pc-key">{info.model}</span> : null}
      </header>

      <div className="pa-body">
        <section className="pa-term" aria-label={`${name} terminal`}>
          <div className="pa-term-host">
            {live?.ptyId ? (
              <PtyTerminalView key={live.ptyId} ptyId={live.ptyId} embedded />
            ) : floor.mode === 'demo' ? (
              <TerminalView key={id} initialLines={demoTerminal(name, rail?.line)} />
            ) : (
              <EmptyState
                icon={<SquareTerminal size={20} />}
                title="No terminal"
                description={`${name} has no live session in this window.`}
              />
            )}
          </div>
          <Composer agentId={id} name={name} canQueue={!!live} />
        </section>

        <aside className="pa-side">
          <Tabs defaultValue="overview" className="paper-tabs pa-tabs">
            <TabsList aria-label="Agent details">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="messages">Messages{mail.length ? ` ${mail.length}` : ''}</TabsTrigger>
              <TabsTrigger value="tasks">Tasks{tasks.length ? ` ${tasks.length}` : ''}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pa-pane">
              <Overview info={info} line={rail?.line} cost={rail?.costToday} current={current} tasks={tasks} mailCount={mail.length} />
            </TabsContent>
            <TabsContent value="messages" className="pa-pane">
              <Messages id={id} mail={mail} agents={floor.agents} />
            </TabsContent>
            <TabsContent value="tasks" className="pa-pane">
              <TaskList tasks={tasks} name={name} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="pa-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Overview({ info, line, cost, current, tasks, mailCount }: {
  info: RoomInfo; line?: string; cost?: string; current?: PaperTask; tasks: PaperTask[]; mailCount: number;
}): JSX.Element {
  const pct = contextPct(info);
  const open = tasks.filter((t) => t.status !== 'done').length;
  return (
    <div className="pa-overview">
      {line ? <p className="pa-line">{line}</p> : null}
      <dl className="pa-dl">
        <Row label="Engine">{info.engine ?? '—'}</Row>
        <Row label="Model"><span className="pa-mono">{info.model ?? '—'}</span></Row>
        <Row label="Workspace"><span className="pa-mono" title={info.cwd}>{info.cwd ?? '—'}</span></Row>
        <Row label="Worktree"><span className="pa-mono" title={info.worktree}>{info.worktree ?? 'Shared folder'}</span></Row>
        <Row label="Current card">{current ? <a href={hrefFor('tasks', current.key)}><span className="pc-key">{current.key}</span> {current.title}</a> : 'None'}</Row>
        <Row label="Open cards">{open}</Row>
        <Row label="Messages">{mailCount}</Row>
        {cost ? <Row label="Spend today">{cost}</Row> : null}
      </dl>
      <div className="pa-budget">
        <div className="pa-budget-head">
          <span>Context</span>
          <span className="pc-key">
            {pct === undefined ? 'Unknown' : `${compact(info.contextTokens ?? 0)} of ${compact(info.contextLimit ?? 0)} · ${pct}%`}
          </span>
        </div>
        <div
          className="pa-meter"
          role="meter"
          aria-label="Context used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct ?? 0}
          data-level={pct === undefined ? 'none' : pct >= 85 ? 'high' : pct >= 60 ? 'mid' : 'low'}
        >
          <span style={{ inlineSize: `${pct ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Messages ──────────────────────────────────────────────────────────────

function Messages({ id, mail, agents }: { id: string; mail: ReturnType<typeof mailFor>; agents: ReturnType<typeof useFloor>['agents'] }): JSX.Element {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [mail.length]);
  if (!mail.length) return <EmptyState title="No messages" description="Mail to and from this agent shows up here." />;
  return (
    <ol className="pa-mail">
      {mail.map((m) => {
        const out = m.from === id;
        const other = out ? m.to : m.from;
        return (
          <li key={m.id} className="pa-mail-item" data-dir={out ? 'out' : 'in'}>
            <div className="pa-mail-meta">
              <span className="pa-mail-who">{out ? `To ${isHuman(other) ? 'You' : agentName(agents, other)}` : `From ${isHuman(other) ? 'You' : agentName(agents, other)}`}</span>
              <Badge tone={m.act === 'done' ? 'success' : m.act === 'request' ? 'accent' : 'neutral'}>{m.act}</Badge>
              <time className="pc-key" dateTime={m.createdAt} title={fullStamp(m.createdAt)}>{relative(m.createdAt)}</time>
            </div>
            {m.subject ? <p className="pa-mail-subject">{m.subject}</p> : null}
            <RichText text={m.body.length > 1200 ? `${m.body.slice(0, 1200)}…` : m.body} />
          </li>
        );
      })}
      <div ref={endRef} />
    </ol>
  );
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

function TaskList({ tasks, name }: { tasks: PaperTask[]; name: string }): JSX.Element {
  if (!tasks.length) return <EmptyState title="No cards" description={`Nothing on the board is assigned to ${name}.`} />;
  return (
    <ul className="pa-tasks">
      {tasks.map((t) => (
        <li key={t.id} className="pa-task" data-status={t.status}>
          <a className="pc-key" href={hrefFor('tasks', t.key)}>{t.key}</a>
          <span className="pa-task-title">{t.title}</span>
          <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}

// ─── Composer (attachments + image paste) ──────────────────────────────────

function Composer({ agentId, name, canQueue }: { agentId: string; name: string; canQueue: boolean }): JSX.Element {
  const enqueue = useStore((s) => s.enqueueMessage);
  const [text, setText] = useState('');
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attsRef = useRef(atts);
  attsRef.current = atts;

  // Revoke thumbnails when the room unmounts or the agent changes.
  useEffect(() => () => attsRef.current.forEach((a) => a.preview && URL.revokeObjectURL(a.preview)), [agentId]);
  useEffect(() => { setAtts([]); setText(''); setNote(null); }, [agentId]);

  const add = (incoming: Attachment[]): void => {
    setAtts((prev) => {
      const seen = new Set(prev.map((a) => a.path));
      const fresh = incoming.filter((a) => a.path && !seen.has(a.path));
      const room = MAX_ATTACHMENTS - prev.length;
      if (fresh.length > room) setNote(`Up to ${MAX_ATTACHMENTS} attachments per message.`);
      fresh.slice(room).forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
      return [...prev, ...fresh.slice(0, Math.max(0, room))];
    });
  };

  const remove = (path: string): void => {
    setAtts((prev) => {
      const gone = prev.find((a) => a.path === path);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return prev.filter((a) => a.path !== path);
    });
  };

  /** Turn browser Files into attachments. Live: images without a path are
   *  written to a temp PNG by the main process; files with a path are used as
   *  is. Demo: a local key plus the thumbnail. */
  const fromFiles = async (files: File[], viaClipboard: boolean): Promise<void> => {
    if (!files.length) return;
    const out: Attachment[] = [];
    for (const f of files) {
      const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
      if (hasBridge()) {
        const p = window.cth.pathForFile(f);
        if (p) { out.push({ path: p, name: f.name, preview }); continue; }
        if (viaClipboard && preview) {
          const res = await window.cth.saveClipboardImage();
          if (res.ok) { out.push({ ...res.file, preview }); continue; }
          setNote(`Could not save the pasted image: ${res.error}`);
        }
        if (preview) URL.revokeObjectURL(preview);
      } else {
        out.push({ path: `clipboard/${Date.now().toString(36)}-${f.name || 'image.png'}`, name: f.name || 'image.png', preview });
      }
    }
    add(out);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>): void => {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((it) => it.kind === 'file')
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (!files.length) return;
    e.preventDefault();
    // A screenshot arrives as a single unnamed image; only that one needs the
    // main-process save, so paste one image at a time from the clipboard.
    void fromFiles(files.slice(0, 1).concat(files.slice(1).filter((f) => !f.type.startsWith('image/'))), true);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDrag(false);
    void fromFiles(Array.from(e.dataTransfer?.files ?? []), false);
  };

  const pick = async (): Promise<void> => {
    if (hasBridge()) {
      const res = await window.cth.attachFiles();
      if (res.ok) add(res.files);
      return;
    }
    fileRef.current?.click();
  };

  const canSend = !!text.trim() || atts.length > 0;

  const send = async (): Promise<void> => {
    if (!canSend) return;
    const body = withAttachments(text, atts);
    if (canQueue) {
      enqueue(agentId, body);
      void window.cth?.trackMessageSent?.('composer');
    } else {
      const ok = await sendMail({ to: agentId, act: 'request', subject: text.trim().split('\n')[0].slice(0, 80) || 'Attachments', body });
      if (!ok) { setNote('Send failed. Your draft is kept.'); return; }
    }
    atts.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setAtts([]);
    setText('');
    setNote(canQueue ? `Queued for ${name}.` : `Sent to ${name}'s inbox.`);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (isComposingKey(e)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      className="pa-composer"
      data-drag={drag ? 'on' : undefined}
      onDragOver={(e) => { e.preventDefault(); if (!drag) setDrag(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false); }}
      onDrop={onDrop}
    >
      {atts.length ? (
        <ul className="pa-atts" aria-label="Attachments">
          {atts.map((a) => (
            <li key={a.path} className="pa-att">
              {a.preview ? <img src={a.preview} alt="" /> : <Paperclip size={14} aria-hidden />}
              <span className="pa-att-name" title={a.path}>{a.name}</span>
              <IconButton label={`Remove ${a.name}`} className="pa-att-x" onClick={() => remove(a.path)}>
                <X size={12} />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="pa-compose-row">
        <Tooltip content="Attach files or images (or paste a screenshot)">
          <IconButton label="Attach files" onClick={() => void pick()}>
            <ImagePlus size={16} />
          </IconButton>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => { void fromFiles(Array.from(e.target.files ?? []), false); e.target.value = ''; }}
        />
        <textarea
          className="pa-input"
          rows={2}
          value={text}
          placeholder={`Message ${name}. Paste or drop images to attach.`}
          aria-label={`Message ${name}`}
          onChange={(e) => { setText(e.target.value); if (note) setNote(null); }}
          onPaste={onPaste}
          onKeyDown={onKey}
        />
        <Button size="sm" onClick={() => void send()} disabled={!canSend}>
          <Send size={14} /> Send
        </Button>
      </div>
      <p className="pa-hint" role="status" aria-live="polite">
        {note ?? (canQueue ? 'Enter sends to the prompt queue · Shift+Enter for a new line' : 'Enter sends as a hive message · Shift+Enter for a new line')}
      </p>
    </div>
  );
}
