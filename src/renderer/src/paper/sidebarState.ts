import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_AGENTS,
  DEFAULT_NOTES,
  DEFAULT_PROJECTS,
  type PaperAgent,
  type PaperNote
} from './demoData';
import { ensureOrder, groupByProject, moveId } from './sidebarOrder';

const ORDER_KEY = 'paper.agentOrder';
const PROJECT_KEY = 'paper.agentProjects';
const NOTES_KEY = 'paper.notes';
const AGENTS_ONLY_KEY = 'paper.sidebarAgentsOnly';
const COLLAPSED_KEY = 'paper.collapsedProjects';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function loadAgents(): PaperAgent[] {
  const projects = readJson<Record<string, string>>(PROJECT_KEY, {});
  return DEFAULT_AGENTS.map((a) => ({
    ...a,
    projectId: projects[a.id] ?? a.projectId
  }));
}

function loadNotes(): PaperNote[] {
  const saved = readJson<PaperNote[] | null>(NOTES_KEY, null);
  return saved ?? DEFAULT_NOTES.map((n) => ({ ...n }));
}

export function useProSidebar(): {
  agents: PaperAgent[];
  notes: PaperNote[];
  projects: typeof DEFAULT_PROJECTS;
  grouped: ReturnType<typeof groupByProject<PaperAgent>>;
  agentsOnly: boolean;
  setAgentsOnly: (on: boolean) => void;
  collapsedProjects: string[];
  toggleProject: (id: string) => void;
  moveAgent: (fromId: string, beforeId: string | null, projectId: string) => void;
  upsertNote: (note: PaperNote) => void;
  removeNote: (id: string) => void;
  createNote: () => PaperNote;
} {
  const [agents, setAgents] = useState<PaperAgent[]>(loadAgents);
  const [notes, setNotes] = useState<PaperNote[]>(loadNotes);
  const [order, setOrder] = useState<string[]>(() =>
    ensureOrder(
      readJson<string[]>(ORDER_KEY, DEFAULT_AGENTS.map((a) => a.id)),
      DEFAULT_AGENTS.map((a) => a.id)
    )
  );
  const [agentsOnly, setAgentsOnlyState] = useState(
    () => readJson<boolean>(AGENTS_ONLY_KEY, false)
  );
  const [collapsedProjects, setCollapsedProjects] = useState<string[]>(() =>
    readJson<string[]>(COLLAPSED_KEY, [])
  );

  useEffect(() => {
    writeJson(ORDER_KEY, order);
  }, [order]);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.projectId;
    writeJson(PROJECT_KEY, map);
  }, [agents]);

  useEffect(() => {
    writeJson(NOTES_KEY, notes);
  }, [notes]);

  useEffect(() => {
    writeJson(AGENTS_ONLY_KEY, agentsOnly);
  }, [agentsOnly]);

  useEffect(() => {
    writeJson(COLLAPSED_KEY, collapsedProjects);
  }, [collapsedProjects]);

  const grouped = useMemo(
    () => groupByProject(agents, order, DEFAULT_PROJECTS),
    [agents, order]
  );

  const moveAgent = useCallback(
    (fromId: string, beforeId: string | null, projectId: string) => {
      setAgents((list) =>
        list.map((a) => (a.id === fromId ? { ...a, projectId } : a))
      );
      setOrder((ids) =>
        moveId(
          ensureOrder(
            ids,
            agents.map((a) => a.id)
          ),
          fromId,
          beforeId
        )
      );
    },
    [agents]
  );

  const toggleProject = useCallback((id: string) => {
    setCollapsedProjects((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }, []);

  const upsertNote = useCallback((note: PaperNote) => {
    setNotes((list) => {
      const i = list.findIndex((n) => n.id === note.id);
      if (i < 0) return [note, ...list];
      const next = list.slice();
      next[i] = note;
      return next;
    });
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((list) => list.filter((n) => n.id !== id));
  }, []);

  const createNote = useCallback((): PaperNote => {
    const note: PaperNote = {
      id: `n-${Date.now().toString(36)}`,
      title: 'Untitled',
      body: '',
      updatedAt: Date.now()
    };
    setNotes((list) => [note, ...list]);
    return note;
  }, []);

  const setAgentsOnly = useCallback((on: boolean) => {
    setAgentsOnlyState(on);
  }, []);

  return {
    agents,
    notes,
    projects: DEFAULT_PROJECTS,
    grouped,
    agentsOnly,
    setAgentsOnly,
    collapsedProjects,
    toggleProject,
    moveAgent,
    upsertNote,
    removeNote,
    createNote
  };
}
