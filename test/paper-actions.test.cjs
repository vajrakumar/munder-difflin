'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { filterActions, highlightMatch } = loadTs('src/renderer/src/paper/actionSearch.ts');

const sample = [
  { id: 'note.new', label: 'New note', group: 'Notes', keywords: 'write private', run() {} },
  { id: 'nav.memory', label: 'Go to Memory', group: 'Navigate', keywords: 'search palace graph', run() {} },
  { id: 'memory.search', label: 'Search memory', group: 'Memory', keywords: 'recall palace', run() {} },
  { id: 'nav.inbox', label: 'Go to Inbox', group: 'Navigate', keywords: 'ask me mail slack', shortcut: 'G I', run() {} }
];

describe('filterActions', () => {
  it('does not match New note on mem', () => {
    const ids = filterActions(sample, 'mem').map((a) => a.id);
    assert.ok(!ids.includes('note.new'));
    assert.ok(ids.includes('nav.memory'));
    assert.ok(ids.includes('memory.search'));
  });

  it('puts recent first when the query is empty', () => {
    const ids = filterActions(sample, '', ['nav.inbox']).map((a) => a.id);
    assert.equal(ids[0], 'nav.inbox');
  });
});

describe('highlightMatch', () => {
  it('marks the matched span', () => {
    const parts = highlightMatch('Go to Inbox', 'inb');
    assert.deepEqual(
      parts.filter((p) => p.hit).map((p) => p.text.toLowerCase()),
      ['inb']
    );
  });
});
