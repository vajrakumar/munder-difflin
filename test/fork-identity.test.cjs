'use strict';

/**
 * MDF-35: the fork is "Vajra's Office". The display name keeps its apostrophe;
 * every machine identifier uses an apostrophe-free slug, differs from upstream,
 * and electron-builder.yml agrees with src/shared/forkIdentity.ts.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const loadTs = require('./load-ts.cjs');

const id = loadTs('src/shared/forkIdentity.ts');
const cfg = yaml.load(fs.readFileSync(path.join(__dirname, '..', 'electron-builder.yml'), 'utf8'));
const SAFE = /^[A-Za-z0-9.-]+$/; // bundle id / scheme / file-name safe, no apostrophe or space

test("display name is Vajra's Office everywhere a person sees it", () => {
  assert.equal(id.APP_DISPLAY_NAME, "Vajra's Office");
  assert.equal(cfg.extraMetadata.productName, id.APP_DISPLAY_NAME);
  assert.equal(cfg.mac.extendInfo.CFBundleDisplayName, id.APP_DISPLAY_NAME);
  assert.equal(cfg.mac.extendInfo.CFBundleName, id.APP_DISPLAY_NAME);
  assert.equal(cfg.protocols[0].name, id.APP_DISPLAY_NAME);
  assert.equal(cfg.nsis.shortcutName, id.APP_DISPLAY_NAME);
  assert.ok(cfg.dmg.title.startsWith(id.APP_DISPLAY_NAME));
});

test('every machine identifier is apostrophe-free and uses the slug', () => {
  assert.equal(id.APP_SLUG, 'vajras-office');
  for (const v of [id.APP_SLUG, id.USER_DATA_DIR_NAME, id.DEEP_LINK_SCHEME, id.GROK_HOOK_FILE_NAME,
    cfg.appId, cfg.extraMetadata.name, ...cfg.protocols[0].schemes]) {
    assert.match(v, SAFE, `${v} must be apostrophe- and space-free`);
  }
  assert.doesNotMatch(cfg.productName, /'/, 'productName names the .app bundle on disk');
  for (const key of ['mac', 'nsis', 'portable', 'linux']) {
    assert.doesNotMatch(cfg[key].artifactName, /['\s]/, `${key}.artifactName`);
  }
  assert.equal(cfg.productName, 'Vajras Office', '.app bundle and executable name');
  assert.equal(cfg.executableName, undefined, 'executableName would rename the .app bundle to the slug');
  assert.equal(cfg.extraMetadata.name, id.APP_SLUG);
  assert.equal(id.USER_DATA_DIR_NAME, id.APP_SLUG);
  assert.deepEqual(cfg.protocols[0].schemes, [id.DEEP_LINK_SCHEME]);
});

test('nothing collides with the installed Munder Difflin', () => {
  assert.notEqual(cfg.appId, 'in.munderdiffl.app');
  assert.notEqual(id.USER_DATA_DIR_NAME, id.UPSTREAM_USER_DATA_DIR_NAME);
  assert.notEqual(id.DEEP_LINK_SCHEME, 'munderdifflin');
  assert.notEqual(id.GROK_HOOK_FILE_NAME, 'munder-hive.json');
  assert.notEqual(cfg.productName, 'Munder Difflin');
  assert.equal(cfg.publish, null, 'no update feed: upstream builds must never replace the fork');
  assert.equal(id.AUTO_UPDATE_ENABLED, false);
});
