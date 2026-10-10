/** Orchestrator (MDF-14): Michael's agent room plus routing, the board,
 *  breaker controls, fleet budget, configuration and restart.
 *  Canonical hash is `#/orchestrator`. PaperApp also mounts this for
 *  `#/agent/god` so the generic agent glob does not steal Michael. */
import { useMemo, useState } from 'react';
import { Avatar, Badge, Button } from '@/ui';
import { agentName, useFloor } from '../../data/hive';
import { type PaperMail, type TaskStatus } from '../../data/model';
import { fullStamp, relative } from '../../data/time';
import { DEFAULT_AGENTS } from '../../demoData';
import { hrefFor, type PaperRoute } from '../../routes';
import { AgentRoom } from '../agent/screen';
import { demoInfo } from '../agent/model';
import { STATUS_LABEL, STATUS_TONE, COLUMNS } from '../tasks/model';
import '../../common/common.css';
import './orchestrator.css';

export const route: PaperRoute = 'orchestrator';

type Breaker = 'idle' | 'steer' | 'constrain' | 'stop';

const BREAKER_COPY: Record<Breaker, { label: string; hint: string; tone: 'neutral' | 'warning' | 'danger' }> = {
  idle: { label: 'Idle', hint: 'Fleet runs under the usual caps.', tone: 'neutral' },
  steer: { label: 'Steer', hint: 'Nudge agents. They finish the current tool, then listen.', tone: 'warning' },
  constrain: { label: 'Constrain', hint: 'New work is paused. In-flight tools drain.', tone: 'warning' },
  stop: { label: 'Stop', hint: 'Hard stop. Terminals stay open so you can read the last lines.', tone: 'danger' }
};

function readBreaker(): Breaker {
  try {
    const v = localStorage.getItem('paper.orch.breaker');
    if (v === 'steer' || v === 'constrain' || v === 'stop' || v === 'idle') return v;
  } catch { /* noop */ }
  return 'idle';
}

function dollars(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function Screen(): JSX.Element {
  return (
    <AgentRoom
      agentId="god"
      extraTabs={[
        { id: 'routing', label: 'Routing', content: <RoutingLog /> },
        { id: 'board', label: 'Board', content: <FleetBoard /> },
        { id: 'control', label: 'Control', content: <Control /> }
      ]}
    />
  );
}

function RoutingLog(): JSX.Element {
  const floor = useFloor();
  const rows = useMemo(() => {
    const list = floor.mail
      .filter((m) => m.from === 'god' || m.to === 'god')
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.slice(0, 40);
  }, [floor.mail]);

  if (!rows.length) {
    return <p className="po-empty">No routing yet. Dispatches Michael sends and the replies land here.</p>;
  }

  return (
    <ol className="po-log">
      {rows.map((m) => (
        <LogRow key={m.id} mail={m} nameOf={(id) => agentName(floor.agents, id)} />
      ))}
    </ol>
  );
}

function LogRow({ mail, nameOf }: { mail: PaperMail; nameOf: (id: string) => string }): JSX.Element {
  const out = mail.from === 'god';
  const other = out ? mail.to : mail.from;
  return (
    <li className="po-log-item" data-dir={out ? 'out' : 'in'}>
      <div className="po-log-meta">
        <span className="po-log-who">
          {out ? `To ${nameOf(other)}` : `From ${nameOf(other)}`}
        </span>
        <Badge tone={mail.act === 'request' ? 'accent' : mail.act === 'done' ? 'success' : mail.act === 'refuse' ? 'danger' : 'neutral'}>
          {mail.act}
        </Badge>
        <time className="pc-key" dateTime={mail.createdAt} title={fullStamp(mail.createdAt)}>{relative(mail.createdAt)}</time>
      </div>
      <p className="po-log-subject">{mail.subject}</p>
    </li>
  );
}

function FleetBoard(): JSX.Element {
  const floor = useFloor();
  const by: Record<TaskStatus, typeof floor.tasks> = { todo: [], doing: [], blocked: [], done: [] };
  for (const t of floor.tasks) by[t.status].push(t);
  return (
    <div className="po-board">
      <p className="po-lede">
        Live ledger · <a href={hrefFor('tasks')}>Open Tasks</a>
      </p>
      <div className="po-cols">
        {COLUMNS.map((col) => (
          <div key={col} className="po-col" data-status={col}>
            <div className="po-col-head">
              {STATUS_LABEL[col]}
              <span>{by[col].length}</span>
            </div>
            <ul className="po-col-list">
              {by[col].map((t) => (
                <li key={t.id}>
                  <a className="po-card" href={hrefFor('tasks', t.key)} title={t.title}>
                    <span className="pc-key">{t.key}</span>
                    <span className="po-card-title">{t.title}</span>
                    <Badge tone={STATUS_TONE[t.status]}>{t.assignee ? agentName(floor.agents, t.assignee) : '—'}</Badge>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Control(): JSX.Element {
  const floor = useFloor();
  const [breaker, setBreaker] = useState<Breaker>(readBreaker);
  const [note, setNote] = useState<string | null>(null);
  const info = demoInfo('god');

  function setLevel(next: Breaker): void {
    setBreaker(next);
    try { localStorage.setItem('paper.orch.breaker', next); } catch { /* noop */ }
    setNote(`Breaker → ${BREAKER_COPY[next].label}`);
  }

  const costById = new Map(DEFAULT_AGENTS.map((a) => [a.id, a.costToday]));
  const fleet = floor.agents
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, name: a.name, costToday: costById.get(a.id) ?? '$0.00' }));
  const total = fleet.reduce((s, a) => s + dollars(a.costToday), 0);
  const dayBudget = 10;
  const live = floor.agents.filter((a) => a.status === 'working' || a.status === 'thinking' || a.status === 'looping').length;

  return (
    <div className="po-control">
      <section className="po-section">
        <h3>Circuit breaker</h3>
        <p className="po-lede" data-tone={BREAKER_COPY[breaker].tone}>
          {BREAKER_COPY[breaker].hint}
        </p>
        <div className="po-breaker" role="group" aria-label="Circuit breaker">
          {(['idle', 'steer', 'constrain', 'stop'] as Breaker[]).map((level) => (
            <Button
              key={level}
              size="sm"
              variant={breaker === level ? (level === 'stop' ? 'danger' : 'primary') : 'secondary'}
              aria-pressed={breaker === level}
              onClick={() => setLevel(level)}
            >
              {BREAKER_COPY[level].label}
            </Button>
          ))}
        </div>
      </section>

      <section className="po-section">
        <h3>Fleet spend today</h3>
        <p className="po-lede">{live} live · {floor.agents.length} on the floor · ${total.toFixed(2)}</p>
        <ul className="po-fleet">
          {fleet.map((a) => {
            const n = dollars(a.costToday);
            return (
              <li key={a.id} className="po-fleet-row">
                <Avatar name={a.name} size="sm" />
                <a className="po-fleet-name" href={hrefFor('agent', a.id)}>{a.name}</a>
                <span
                  className="po-meter"
                  role="meter"
                  aria-label={`${a.name} spend`}
                  aria-valuemin={0}
                  aria-valuemax={dayBudget}
                  aria-valuenow={n}
                >
                  <span style={{ inlineSize: `${Math.min(100, (n / dayBudget) * 100)}%` }} />
                </span>
                <span className="pc-key">{a.costToday}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="po-section">
        <h3>Configuration</h3>
        <dl className="po-dl">
          <div><dt>Engine</dt><dd>{info.engine ?? '—'}</dd></div>
          <div><dt>Model</dt><dd className="pc-key">{info.model ?? '—'}</dd></div>
          <div><dt>Mode</dt><dd>{floor.mode === 'live' ? 'Live hive' : 'Demo'}</dd></div>
        </dl>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setNote('Restart queued. Michael will come back on the same worktree.')}
        >
          Restart orchestrator
        </Button>
        {note ? <p className="po-note" role="status">{note}</p> : null}
      </section>
    </div>
  );
}
