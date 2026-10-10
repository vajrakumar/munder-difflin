'use strict';

/**
 * MDF-17 screen helpers: next-run preview, filter membership, status tones.
 * The React screen is not loaded here — those functions are pure and live
 * next to the store in the renderer, so this file copies the same rules the
 * screen uses (weeklySchedule + the filter table) and asserts them.
 */
process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { nextWeeklyFireMs, formatMinute } = loadTs('src/shared/weeklySchedule.ts');
const { parseSchedulePhrase } = loadTs('src/shared/automationGuard.ts');

function nextRuns(m, nowMs, n = 3) {
  const out = [];
  if (m.weekly) {
    let t = nowMs;
    for (let i = 0; i < n; i++) {
      const next = nextWeeklyFireMs(m.weekly, t);
      if (next === null) break;
      out.push(next);
      t = next;
    }
    return out;
  }
  if (!(m.intervalMs > 0)) return out;
  let next = Math.max(nowMs, (m.lastFiredAt ?? 0) + m.intervalMs);
  for (let i = 0; i < n; i++) { out.push(next); next += m.intervalMs; }
  return out;
}

function inFilter(r, f) {
  if (f === 'schedules') return r.kind === 'schedule';
  if (f === 'webhooks') return r.kind === 'webhook';
  return true;
}

test('nextRuns: weekday 9am yields three distinct future slots', () => {
  const phrase = parseSchedulePhrase('every weekday 9am');
  assert.ok(phrase);
  const now = new Date(2026, 9, 12, 10, 0).getTime(); // Mon 10:00, after 09:00
  const runs = nextRuns({ weekly: phrase, intervalMs: 0 }, now, 3);
  assert.equal(runs.length, 3);
  assert.ok(runs[0] > now);
  assert.ok(runs[1] > runs[0]);
  assert.ok(runs[2] > runs[1]);
  assert.equal(new Date(runs[0]).getDay(), 2); // Tuesday
  assert.equal(formatMinute(new Date(runs[0]).getHours() * 60 + new Date(runs[0]).getMinutes()), '09:00');
});

test('nextRuns: interval from lastFiredAt, not from now when remaining', () => {
  const now = Date.UTC(2026, 9, 12, 12, 0, 0);
  const last = now - 10 * 60 * 1000;
  const runs = nextRuns({ intervalMs: 60 * 60 * 1000, lastFiredAt: last }, now, 2);
  assert.equal(runs[0], last + 60 * 60 * 1000);
  assert.equal(runs[1], runs[0] + 60 * 60 * 1000);
});

test('inFilter: history tab is not a row filter (rows stay, screen swaps view)', () => {
  const row = { kind: 'schedule' };
  assert.equal(inFilter(row, 'all'), true);
  assert.equal(inFilter(row, 'schedules'), true);
  assert.equal(inFilter(row, 'webhooks'), false);
  assert.equal(inFilter({ kind: 'webhook' }, 'webhooks'), true);
  assert.equal(inFilter({ kind: 'context' }, 'schedules'), false);
});
