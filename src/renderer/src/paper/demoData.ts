import type { StatusName } from '@/design/paper';

export const PRODUCT_NAME = "Vajra's Office";

export type PaperTicket = {
  key: string;
  title: string;
  status: string;
};

export type PaperAgent = {
  id: string;
  name: string;
  role: string;
  projectId: string;
  status: StatusName;
  line: string;
  tool?: string;
  askedYou?: boolean;
  ticket?: PaperTicket;
  costToday?: string;
};

export type PaperProject = {
  id: string;
  name: string;
};

export type PaperNote = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

export const DEFAULT_PROJECTS: PaperProject[] = [
  { id: 'office', name: "Vajra's Office" },
  { id: 'apilayer', name: 'APILayer' },
  { id: 'research', name: 'Research' }
];

export const DEFAULT_AGENTS: PaperAgent[] = [
  {
    id: 'god',
    name: 'Michael',
    role: 'Orchestrator',
    projectId: 'office',
    status: 'working',
    line: 'Routing the floor',
    costToday: '$0.12'
  },
  {
    id: 'developer-mv2fn62v',
    name: 'Developer',
    role: 'Developer',
    projectId: 'apilayer',
    status: 'working',
    line: 'Building the Pro sidebar',
    tool: 'Edit',
    ticket: { key: 'MDF-11', title: 'Pro sidebar', status: 'doing' },
    costToday: '$1.40'
  },
  {
    id: 'tester-mv2fnyz5',
    name: 'Tester',
    role: 'Tester',
    projectId: 'apilayer',
    status: 'waiting',
    line: 'Need a call on harness-home before Electron',
    askedYou: true,
    ticket: { key: 'MDF-36', title: 'Pin harness home', status: 'done' },
    costToday: '$0.44'
  },
  {
    id: 'phyllis-mv2fq1rq',
    name: 'Phyllis',
    role: 'Packaging',
    projectId: 'office',
    status: 'working',
    line: 'Rebrand and side-by-side packaging',
    tool: 'Edit',
    ticket: { key: 'MDF-35', title: "Vajra's Office rebrand", status: 'doing' },
    costToday: '$0.61'
  },
  {
    id: 'dwight-mv2fp3un',
    name: 'Dwight',
    role: 'Prep',
    projectId: 'research',
    status: 'thinking',
    line: 'Next-phase cards after the Pro screens',
    costToday: '$0.08'
  }
];

export const DEFAULT_NOTES: PaperNote[] = [
  {
    id: 'n-launch',
    title: 'Launch notes',
    body: 'Ship Paper chrome behind the classic-UI flag. Keep the pixel floor as a fallback until the office restyle lands.',
    updatedAt: Date.parse('2026-10-09T12:00:00Z')
  },
  {
    id: 'n-hive',
    title: 'Do not point at the live hive',
    body: 'The fork pins its own harness home (MDF-36, 31f9bfa2). Never set harnessHome to /Users/vajra/APILayer/myDifflin. Preview UI in the gallery until you confirm the tree contains that commit.',
    updatedAt: Date.parse('2026-10-10T08:10:00Z')
  },
  {
    id: 'n-polish',
    title: 'Sidebar polish',
    body: 'Projects, drag order, live line, asked-you, private notes, hover cards for tickets. Agents-and-notes-only densifies the rail.',
    updatedAt: Date.parse('2026-10-10T09:00:00Z')
  }
];
