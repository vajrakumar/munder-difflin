'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { searchSettings, SETTING_FIELDS, SETTINGS_SECTIONS } = loadTs('src/shared/settingsCatalog.ts');
const { suggestedForkHome } = loadTs('src/shared/forkHomeSuggest.ts');
const { FORK_HOME_DIR_NAME, USER_DATA_DIR_NAME } = loadTs('src/shared/forkIdentity.ts');

test('searching "budget" finds token cap fields', () => {
  const hits = searchSettings('budget');
  const ids = hits.map((h) => h.id);
  assert.ok(ids.includes('costCapTokens'), `floor token budget missing: ${ids.join(',')}`);
  assert.ok(ids.includes('agentTokenCap'), `per-agent token cap missing: ${ids.join(',')}`);
});

test('every current Settings section is in the catalog', () => {
  const ids = SETTINGS_SECTIONS.map((s) => s.id);
  for (const need of ['appearance', 'general', 'prerequisites', 'agents', 'autonomy', 'connections', 'voice', 'memory']) {
    assert.ok(ids.includes(need), `missing section ${need}`);
  }
  assert.equal(SETTING_FIELDS.length, new Set(SETTING_FIELDS.map((f) => f.id)).size);
});

test('MDF-48 first-run home is the pinned fork home, not HarnessAgents', () => {
  const mac = suggestedForkHome('darwin');
  assert.match(mac, new RegExp(`${USER_DATA_DIR_NAME}/${FORK_HOME_DIR_NAME}`));
  assert.equal(mac.includes('HarnessAgents'), false);
  const win = suggestedForkHome('win32');
  assert.equal(win.includes('HarnessAgents'), false);
  assert.match(win, new RegExp(`${USER_DATA_DIR_NAME}\\\\${FORK_HOME_DIR_NAME}`));
  const linux = suggestedForkHome('linux');
  assert.match(linux, new RegExp(`${USER_DATA_DIR_NAME}/${FORK_HOME_DIR_NAME}`));
});
