/** Home (MDF-12): live agent tile grid with filters. Office view stays optional later. */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, Input, StatusRing } from '@/ui';
import { useFloor } from '../../data/hive';
import { DetachButton, Detachable } from '../../Detachable';
import { hrefFor } from '../../routes';
import { copyFor, currentLang } from '../archived/copy';
import { DEFAULT_PROJECTS, type PaperAgent } from '../../demoData';
import { floorStatusLine, isLiveAgent } from '../../statusLine';
import { useProSidebar } from '../../sidebarState';
import type { PaperRoute } from '../../routes';
import '../../common/common.css';
import './home.css';

export const route: PaperRoute = 'home';

type Filter = 'all' | 'live' | 'asked';

const isLive = isLiveAgent;

function Tile({ agent, project }: { agent: PaperAgent; project?: string }): JSX.Element {
  return (
    <a className="ph-tile" href={hrefFor('agent', agent.id)}>
      <div className="ph-tile-head">
        <StatusRing status={agent.status}>
          <Avatar name={agent.name} />
        </StatusRing>
        <div className="ph-tile-id">
          <div className="ph-tile-name">{agent.name}</div>
          <div className="ph-tile-role">{agent.role}{project ? ` · ${project}` : ''}</div>
        </div>
        {agent.askedYou ? <Badge tone="danger">Asked you</Badge> : null}
      </div>
      <p className="ph-tile-line">{agent.line}</p>
      <div className="ph-tile-meta">
        {agent.tool ? <span>Tool {agent.tool}</span> : <span>{agent.status}</span>}
        {agent.ticket ? <Badge tone="accent">{agent.ticket.key}</Badge> : null}
        {agent.costToday ? <span className="ph-tile-cost">{agent.costToday}</span> : null}
      </div>
    </a>
  );
}

export function Screen(): JSX.Element {
  const { agents: allAgents, projects } = useProSidebar();
  const floor = useFloor();
  const archived = new Set(floor.agents.filter((a) => a.archived).map((a) => a.id));
  const agents = allAgents.filter((a) => !archived.has(a.id));
  const t = copyFor(currentLang());
  const [filter, setFilter] = useState<Filter>('all');
  const [projectId, setProjectId] = useState('all');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return agents.filter((a) => {
      if (filter === 'live' && !isLive(a)) return false;
      if (filter === 'asked' && !a.askedYou) return false;
      if (projectId !== 'all' && a.projectId !== projectId) return false;
      if (query && !`${a.name} ${a.role} ${a.line} ${a.ticket?.key ?? ''}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [agents, filter, projectId, q]);

  const live = agents.filter(isLive).length;
  const asked = agents.filter((a) => a.askedYou).length;

  return (
    <Detachable target={{ view: 'office' }}>
    <div className="pc-screen ph-home">
      <header className="ph-bar">
        <div>
          <h1>Home</h1>
          <p className="lede">
            {floorStatusLine(agents)}
          </p>
        </div>
        <DetachButton target={{ view: 'office' }} label={t.detachOffice} />
        <div className="ph-filters">
          <div className="ph-chips" role="group" aria-label="Status filter">
            {([
              ['all', `All ${agents.length}`],
              ['live', `Live ${live}`],
              ['asked', `Asked ${asked}`]
            ] as Array<[Filter, string]>).map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={filter === id ? 'primary' : 'secondary'}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          <select
            className="paper-input ph-project"
            aria-label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="all">All projects</option>
            {(projects.length ? projects : DEFAULT_PROJECTS).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="ph-search">
            <Search size={14} aria-hidden="true" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter agents"
              aria-label="Filter agents"
            />
          </div>
        </div>
      </header>
      {shown.length === 0 ? (
        <EmptyState title="No agents match" description="Clear filters to see the floor." />
      ) : (
        <div className="ph-grid">
          {shown.map((a) => (
            <Tile
              key={a.id}
              agent={a}
              project={projects.find((p) => p.id === a.projectId)?.name}
            />
          ))}
        </div>
      )}
    </div>
    </Detachable>
  );
}
