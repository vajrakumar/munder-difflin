'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { parseHash, hrefFor } = loadTs('src/renderer/src/paper/routes.ts');
const {
  isGod, canArchive, canStop, confirmDelete, lastTaskFor, archivedRows, filterRows,
  applyStop, applyArchive, applyReopen, applyDelete
} = loadTs('src/renderer/src/paper/screens/archived/model.ts');
const {
  keyOf, parseKey, parseDetachQuery, detachSearch, parseBounds, windowFeatures, focusedViewFromRoute
} = loadTs('src/renderer/src/paper/detach.ts');

const god = { id: 'god', name: 'Michael', status: 'working', isGod: true };
const dwight = { id: 'dwight', name: 'Dwight', role: 'Plan', status: 'idle' };
const pam = {
  id: 'pam', name: 'Pam', role: 'Memory', status: 'ghost', archived: true,
  archivedAt: '2026-10-10T12:00:00.000Z', lastTaskKey: 'MDF-18', lastTaskTitle: 'Memory', diskUsed: '42 MB'
};
const andy = {
  id: 'andy', name: 'Andy', role: 'Autos', status: 'ghost', archived: true,
  worktreeMissing: true, archivedAt: '2026-10-10T11:00:00.000Z'
};

describe('routes: archived', () => {
  it('parses #/agents/archived', () => {
    assert.deepEqual(parseHash('#/agents/archived'), { route: 'archived' });
    assert.deepEqual(parseHash('#/archived'), { route: 'archived' });
  });
  it('does not steal #/agent/<id>', () => {
    assert.deepEqual(parseHash('#/agent/god'), { route: 'agent', agentId: 'god' });
  });
  it('hrefFor archived is /agents/archived', () => {
    assert.equal(hrefFor('archived'), '#/agents/archived');
  });
});

describe('archive rules', () => {
  it('never archives or stops god', () => {
    assert.equal(isGod(god), true);
    assert.equal(canArchive(god), false);
    assert.equal(canStop(god), false);
    assert.equal(applyArchive([god], 'god', []).every((a) => !a.archived), true);
    assert.equal(applyStop([god], 'god')[0].stopped, undefined);
    assert.equal(applyDelete([god], 'god').length, 1);
  });
  it('stop keeps the agent on the floor', () => {
    const next = applyStop([dwight], 'dwight');
    assert.equal(next[0].stopped, true);
    assert.equal(next[0].archived, undefined);
    assert.equal(next[0].status, 'idle');
  });
  it('archive hides, reopen restores the same id', () => {
    const tasks = [{ id: 'MDF-2', key: 'MDF-2', title: 'Plan', assignee: 'dwight', status: 'doing' }];
    const archived = applyArchive([dwight], 'dwight', tasks, '2026-10-10T15:00:00.000Z');
    assert.equal(archived[0].archived, true);
    assert.equal(archived[0].lastTaskKey, 'MDF-2');
    assert.equal(archived[0].id, 'dwight');
    const back = applyReopen(archived, 'dwight');
    assert.equal(back[0].archived, false);
    assert.equal(back[0].id, 'dwight');
    assert.equal(back[0].status, 'idle');
  });
  it('reopen with a fresh worktree clears the missing flag', () => {
    const next = applyReopen([andy], 'andy', true);
    assert.equal(next[0].worktreeMissing, false);
    assert.equal(next[0].archived, false);
  });
  it('delete permanently drops the row', () => {
    assert.equal(applyDelete([pam, dwight], 'pam').map((a) => a.id).join(','), 'dwight');
  });
  it('delete confirm requires the exact name', () => {
    assert.equal(confirmDelete('Pam', 'Pam'), true);
    assert.equal(confirmDelete(' pam ', 'Pam'), false);
    assert.equal(confirmDelete('P', 'Pam'), false);
  });
  it('lists archived newest first and filters by query', () => {
    const rows = archivedRows([god, dwight, pam, andy], []);
    assert.deepEqual(rows.map((r) => r.id), ['pam', 'andy']);
    assert.equal(filterRows(rows, 'memory').map((r) => r.id).join(), 'pam');
    assert.equal(lastTaskFor('dwight', [{ assignee: 'dwight', key: 'MDF-2', title: 'Plan', status: 'todo' }]).key, 'MDF-2');
  });
});

describe('detach helpers', () => {
  it('round-trips query string and key', () => {
    const t = { view: 'terminal', agentId: 'developer-mv2fn62v' };
    assert.equal(keyOf(t), 'terminal:developer-mv2fn62v');
    assert.deepEqual(parseKey(keyOf(t)), t);
    assert.equal(detachSearch(t), '?detach=terminal&agent=developer-mv2fn62v');
    assert.deepEqual(parseDetachQuery(detachSearch(t)), t);
    assert.equal(parseDetachQuery(''), null);
  });
  it('restores window features from saved bounds', () => {
    const b = parseBounds(JSON.stringify({ x: 40, y: 80, width: 900, height: 600 }));
    assert.equal(b.width, 900);
    assert.match(windowFeatures(b), /width=900/);
    assert.match(windowFeatures(b), /left=40/);
    assert.equal(parseBounds('nope'), null);
  });
  it('picks the focused view from the paper route', () => {
    assert.deepEqual(focusedViewFromRoute('home'), { view: 'office' });
    assert.deepEqual(focusedViewFromRoute('agent', 'dwight'), { view: 'terminal', agentId: 'dwight' });
    assert.deepEqual(focusedViewFromRoute('archived'), { view: 'ide' });
  });
});
