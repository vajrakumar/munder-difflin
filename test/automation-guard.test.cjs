'use strict';

/**
 * MDF-17 automation guards — quiet hours, daily caps, dry runs and the typed
 * schedule phrase, plus how the webhook server maps a guard verdict to HTTP.
 * Runs under TZ=UTC so local construction means the same thing everywhere.
 */
process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const loadTs = require('./load-ts.cjs');

const {
  normalizeGuards, inQuietHours, evaluateGuards, startOfLocalDay, budgetLine, parseSchedulePhrase
} = loadTs('src/shared/automationGuard.ts');
const { WebhookServer } = loadTs('src/main/webhook.ts');

const at = (h, m = 0) => new Date(2026, 9, 12, h, m).getTime(); // Mon 12 Oct 2026

test('quiet hours: same-day window, inclusive start, exclusive end', () => {
  const q = { enabled: true, startMinute: 12 * 60, endMinute: 13 * 60 };
  assert.equal(inQuietHours(q, at(11, 59)), false);
  assert.equal(inQuietHours(q, at(12, 0)), true);
  assert.equal(inQuietHours(q, at(12, 59)), true);
  assert.equal(inQuietHours(q, at(13, 0)), false);
});

test('quiet hours: a window that wraps midnight', () => {
  const q = { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60 };
  assert.equal(inQuietHours(q, at(23, 30)), true);
  assert.equal(inQuietHours(q, at(3, 0)), true);
  assert.equal(inQuietHours(q, at(7, 0)), false);
  assert.equal(inQuietHours(q, at(12, 0)), false);
});

test('quiet hours: disabled or empty windows never hold a run', () => {
  assert.equal(inQuietHours({ enabled: false, startMinute: 0, endMinute: 1439 }, at(12)), false);
  assert.equal(inQuietHours({ enabled: true, startMinute: 600, endMinute: 600 }, at(10)), false);
  assert.equal(inQuietHours(undefined, at(10)), false);
});

test('evaluateGuards: quiet first, then cap, then dry run', () => {
  const g = {
    quietHours: { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60 },
    guardrails: { maxRunsPerDay: 2, dryRun: true }
  };
  assert.deepEqual(evaluateGuards(g, at(23), 5), { action: 'skip', reason: 'quiet' });
  assert.deepEqual(evaluateGuards(g, at(9), 2), { action: 'skip', reason: 'cap' });
  assert.deepEqual(evaluateGuards(g, at(9), 1), { action: 'dry-run' });
  assert.deepEqual(evaluateGuards(undefined, at(9), 99), { action: 'run' });
});

test('normalizeGuards drops nonsense instead of guessing', () => {
  assert.equal(normalizeGuards(null), undefined);
  assert.equal(normalizeGuards({ quietHours: { enabled: true, startMinute: 2000, endMinute: 10 } }), undefined);
  assert.deepEqual(
    normalizeGuards({ guardrails: { maxRunsPerDay: 3.7, maxTokensPerRun: -5, dryRun: 'yes' } }),
    { guardrails: { maxRunsPerDay: 3 } }
  );
  assert.deepEqual(
    normalizeGuards({ quietHours: { enabled: 1, startMinute: 0, endMinute: 60 } }),
    { quietHours: { enabled: false, startMinute: 0, endMinute: 60 } }
  );
});

test('startOfLocalDay and budgetLine', () => {
  assert.equal(startOfLocalDay(at(15, 45)), at(0, 0));
  assert.equal(budgetLine(undefined), '');
  assert.match(budgetLine({ guardrails: { maxTokensPerRun: 50000 } }), /50000 tokens/);
});

test('parseSchedulePhrase reads common phrasings', () => {
  assert.deepEqual(parseSchedulePhrase('every weekday 9am'), { days: [1, 2, 3, 4, 5], minute: 540 });
  assert.deepEqual(parseSchedulePhrase('Mon, Thu at 14:30'), { days: [1, 4], minute: 870 });
  assert.deepEqual(parseSchedulePhrase('daily 6pm'), { days: [0, 1, 2, 3, 4, 5, 6], minute: 1080 });
  assert.deepEqual(parseSchedulePhrase('weekends at noon'), { days: [0, 6], minute: 720 });
  assert.deepEqual(parseSchedulePhrase('friday 12am'), { days: [5], minute: 0 });
  assert.equal(parseSchedulePhrase('sometime soon'), null);
  assert.equal(parseSchedulePhrase('every monday'), null, 'no time → leave the fields alone');
});

/* ─────────────── webhook server: guard verdict → HTTP status ─────────────── */

const SECRET = 'c'.repeat(64);
const SCHEMA = JSON.stringify({ type: 'object', required: ['message'], properties: { message: { type: 'string' } } });

function makeServer(verdict) {
  const seen = { routed: 0, invalid: [] };
  const server = new WebhookServer({
    port: 0,
    endpoints: [{ id: 'hook', name: 'Hook', secret: SECRET, schema: SCHEMA }],
    onMessage: () => { seen.routed++; return { token: 't', taskId: 'x', pending: false }; },
    lookupStatus: () => null,
    guard: () => verdict,
    onInvalid: (endpoint, error) => seen.invalid.push({ endpoint, error })
  });
  return { server, seen };
}

function post(server, body) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = 'POST';
    req.url = '/hook';
    req.headers = { 'x-md-webhook-secret': SECRET };
    req.destroy = () => {};
    const res = {
      writeHead(status) { res._status = status; return res; },
      end(payload) { resolve({ status: res._status, body: payload ? JSON.parse(payload) : null }); }
    };
    server.handleRequest(req, res);
    req.emit('data', Buffer.from(body));
    req.emit('end');
  });
}

test('webhook guard: run routes, dry run answers 200 without routing', async () => {
  const run = makeServer({ action: 'run' });
  assert.equal((await post(run.server, '{"message":"hi"}')).status, 200);
  assert.equal(run.seen.routed, 1);

  const dry = makeServer({ action: 'dry-run' });
  const r = await post(dry.server, '{"message":"hi"}');
  assert.equal(r.status, 200);
  assert.equal(r.body.dryRun, true);
  assert.equal(dry.seen.routed, 0);
});

test('webhook guard: quiet hours → 503, daily cap → 429, never routed', async () => {
  const quiet = makeServer({ action: 'skip', reason: 'quiet' });
  const q = await post(quiet.server, '{"message":"hi"}');
  assert.equal(q.status, 503);
  assert.equal(q.body.skipped, 'quiet');
  const cap = makeServer({ action: 'skip', reason: 'cap' });
  assert.equal((await post(cap.server, '{"message":"hi"}')).status, 429);
  assert.equal(quiet.seen.routed + cap.seen.routed, 0);
});

test('webhook: a schema failure is 400 and reported without the secret', async () => {
  const { server, seen } = makeServer({ action: 'run' });
  const r = await post(server, '{"title":"no message"}');
  assert.equal(r.status, 400);
  assert.equal(seen.invalid.length, 1);
  assert.deepEqual(Object.keys(seen.invalid[0].endpoint).sort(), ['id', 'name']);
  assert.equal(seen.routed, 0);
});
