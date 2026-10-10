/**
 * AUTOMATION GUARDS (MDF-17) — quiet hours and guardrails shared by schedules
 * and webhooks, plus the "every weekday 9am" phrase reader the editor uses.
 *
 * Pure and import-free (like weeklySchedule.ts) so the test loader can take it
 * directly. Main calls `evaluateGuards` right before a run is sent: the
 * scheduler before `hive.send`, the webhook handler before `onMessage`.
 *
 * Everything is LOCAL time, for the same reason weeklySchedule.ts gives: "no
 * runs 22:00–07:00" means the clock where the user is sitting.
 */

export interface QuietHours {
  enabled: boolean;
  /** Minutes since local midnight, 0..1439. The window may wrap midnight. */
  startMinute: number;
  endMinute: number;
}

export interface Guardrails {
  /** Real runs allowed per local day; 0 or absent = no cap. */
  maxRunsPerDay?: number;
  /** Token budget stated to the receiving agent; 0 or absent = none. */
  maxTokensPerRun?: number;
  /** Log the run in History but never send it. */
  dryRun?: boolean;
}

export interface AutomationGuards {
  quietHours?: QuietHours;
  guardrails?: Guardrails;
}

export type GuardVerdict =
  | { action: 'run' }
  | { action: 'dry-run' }
  | { action: 'skip'; reason: 'quiet' | 'cap' };

function minuteOk(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1439;
}

function countOk(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined;
}

/** Canonicalise whatever the renderer sent. Unusable parts are dropped rather
 *  than guessed, so a bad field can only ever make a guard looser than asked,
 *  never block an automation the user did not ask to block. */
export function normalizeGuards(raw: unknown): AutomationGuards | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { quietHours?: Partial<QuietHours>; guardrails?: Partial<Guardrails> };
  const out: AutomationGuards = {};
  const q = r.quietHours;
  if (q && minuteOk(q.startMinute) && minuteOk(q.endMinute)) {
    out.quietHours = { enabled: q.enabled === true, startMinute: q.startMinute, endMinute: q.endMinute };
  }
  const g = r.guardrails;
  if (g && typeof g === 'object') {
    const rails: Guardrails = {};
    const runs = countOk(g.maxRunsPerDay);
    const tokens = countOk(g.maxTokensPerRun);
    if (runs) rails.maxRunsPerDay = runs;
    if (tokens) rails.maxTokensPerRun = tokens;
    if (g.dryRun === true) rails.dryRun = true;
    if (Object.keys(rails).length) out.guardrails = rails;
  }
  return Object.keys(out).length ? out : undefined;
}

/** True when `nowMs` falls inside the window. Start is inclusive, end is
 *  exclusive; start === end is an empty window (never quiet), not 24 hours. */
export function inQuietHours(q: QuietHours | undefined, nowMs: number): boolean {
  if (!q || !q.enabled || q.startMinute === q.endMinute) return false;
  const d = new Date(nowMs);
  const m = d.getHours() * 60 + d.getMinutes();
  return q.startMinute < q.endMinute
    ? m >= q.startMinute && m < q.endMinute
    : m >= q.startMinute || m < q.endMinute;
}

/** Local midnight at or before `nowMs` (calendar fields, DST-safe). */
export function startOfLocalDay(nowMs: number): number {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Decide one run. `runsToday` counts REAL runs only (not skips or dry runs).
 *  Order matters: quiet hours first, so a quiet-hours skip never burns the cap. */
export function evaluateGuards(g: AutomationGuards | undefined, nowMs: number, runsToday: number): GuardVerdict {
  if (inQuietHours(g?.quietHours, nowMs)) return { action: 'skip', reason: 'quiet' };
  const cap = g?.guardrails?.maxRunsPerDay;
  if (cap && runsToday >= cap) return { action: 'skip', reason: 'cap' };
  if (g?.guardrails?.dryRun) return { action: 'dry-run' };
  return { action: 'run' };
}

/** The line appended to a dispatched body when a token budget is set. The
 *  budget is a stated limit the agent and the circuit breaker read; main cannot
 *  meter tokens before a run exists. */
export function budgetLine(g: AutomationGuards | undefined): string {
  const t = g?.guardrails?.maxTokensPerRun;
  return t ? `\n\n[Automation budget: stop and report if this run would use more than ${t} tokens.]` : '';
}

/* ───────────────────────────── phrase reader ─────────────────────────────── */

const DAY_WORDS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6
};

/**
 * Read a typed phrase such as "every weekday 9am", "mon, thu at 14:30" or
 * "daily 6pm" into a weekly schedule. Returns null when no day or no time can be
 * found, so the editor leaves the fields alone instead of guessing.
 */
export function parseSchedulePhrase(phrase: string): { days: number[]; minute: number } | null {
  const s = phrase.toLowerCase().replace(/[,]/g, ' ');
  let days: number[] = [];
  if (/\b(daily|every\s*day|everyday)\b/.test(s)) days = [0, 1, 2, 3, 4, 5, 6];
  else if (/\bweekdays?\b/.test(s)) days = [1, 2, 3, 4, 5];
  else if (/\bweekends?\b/.test(s)) days = [0, 6];
  else {
    for (const w of s.split(/[^a-z]+/)) if (w in DAY_WORDS) days.push(DAY_WORDS[w]);
  }
  days = [...new Set(days)].sort((a, b) => a - b);

  let minute: number | null = null;
  const t = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ?? s.match(/\b(\d{1,2}):(\d{2})\b/);
  if (t) {
    let h = Number(t[1]);
    const m = t[2] ? Number(t[2]) : 0;
    const ap = t[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h <= 23 && m <= 59) minute = h * 60 + m;
  } else if (/\bnoon\b/.test(s)) minute = 720;
  else if (/\bmidnight\b/.test(s)) minute = 0;

  if (!days.length || minute === null) return null;
  return { days, minute };
}
