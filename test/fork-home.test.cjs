'use strict';

/**
 * MDF-36: the fork must never open the installed app's hive. userData isolation
 * alone did not stop a dev build booting against the live office, because the
 * harness home in its config.json was the live one. These tests prove:
 *   (a) an empty home defaults to the fork's own folder under its userData,
 *   (b) any home the installed app uses (its config.json, floor configs, or a
 *       floor named by its floor lock) is refused on read, write and mkdir,
 *   (c) Grok hooks go to their own file, not upstream's munder-hive.json.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

// Fake appData holding both apps' userData folders, owned by this test.
const appData = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-fork-home-')));
const userData = path.join(appData, 'munder-difflin-fork');
const upstream = path.join(appData, 'munder-difflin');
fs.mkdirSync(userData, { recursive: true });

const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron,
  filename: electron,
  loaded: true,
  exports: { app: { getPath: (name) => (name === 'appData' ? appData : userData) } }
};

const { readConfig, writeConfig, ensureHarnessHome } = loadTs('src/main/config.ts');
const { checkForkHome, upstreamHomes, forkDefaultHome } = loadTs('src/main/forkHome.ts');
const { GROK_HOOK_FILE_NAME } = loadTs('src/shared/forkIdentity.ts');
const { HiveManager } = loadTs('src/main/hive.ts');

test.after(() => fs.rmSync(appData, { recursive: true, force: true }));

const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); };
const forkConfig = path.join(userData, 'config.json');
const resetFork = () => fs.rmSync(forkConfig, { force: true });

// The installed app's homes, laid out the way v0.5.5 stores them.
const liveHome = path.join(appData, 'live-office');           // floors/<id>/config.json
const topHome = path.join(appData, 'top-home');               // config.json harnessHome
const recentHome = path.join(appData, 'old-recent');          // config.json recentHives
const lockedHome = path.join(appData, 'elsewhere-floor-home'); // only via floor-numbers.json
const elsewhereFloor = path.join(appData, 'floor-data-elsewhere');
for (const d of [liveHome, topHome, recentHome, lockedHome]) fs.mkdirSync(d, { recursive: true });
writeJson(path.join(upstream, 'config.json'), { harnessHome: topHome, recentHives: [topHome, recentHome] });
writeJson(path.join(upstream, 'floors', '96f3d0e86534', 'config.json'), { harnessHome: liveHome, recentHives: [liveHome] });
writeJson(path.join(elsewhereFloor, 'config.json'), { harnessHome: lockedHome });
writeJson(path.join(upstream, 'floor-numbers.json'), { 2: { pid: 1, dataDir: elsewhereFloor } });

test('(a) a fresh fork defaults its harness home to its own folder under userData', () => {
  resetFork();
  const home = readConfig().harnessHome;
  assert.equal(home, path.join(userData, 'harness-home'));
  assert.equal(home, forkDefaultHome(userData));
  assert.ok(home.startsWith(userData + path.sep), 'default home must live inside the fork userData');
  assert.equal(ensureHarnessHome(home).ok, true, 'the default home must be creatable');
});

test('(b) upstreamHomes reads config.json, every floor config and the floor lock', () => {
  const homes = upstreamHomes(appData).sort();
  assert.deepEqual(homes, [liveHome, lockedHome, recentHome, topHome].sort());
});

test('(b) every installed-app home is refused, including via ~, trailing slash and symlink', () => {
  for (const h of [liveHome, topHome, recentHome, lockedHome]) {
    assert.equal(checkForkHome(h, appData).ok, false, `${h} must be refused`);
  }
  assert.equal(checkForkHome(liveHome + path.sep, appData).ok, false, 'trailing slash');
  const alias = path.join(appData, 'alias-to-live');
  fs.symlinkSync(liveHome, alias);
  assert.equal(checkForkHome(alias, appData).ok, false, 'symlink to the live home');
  const realHome = process.env.HOME;
  process.env.HOME = appData;
  try {
    assert.equal(checkForkHome('~/live-office', appData).ok, false, '~ form of the live home');
  } finally { process.env.HOME = realHome; }
  assert.equal(checkForkHome(path.join(upstream, 'x'), appData).ok, false, 'inside upstream userData');
});

test('(b) a different folder, even one inside the live home, is allowed', () => {
  assert.equal(checkForkHome(path.join(appData, 'my-fork-home'), appData).ok, true);
  assert.equal(checkForkHome(path.join(liveHome, '.dev-hive'), appData).ok, true);
});

test('(b) a stored live home is replaced on read and dropped from recents', () => {
  writeJson(forkConfig, { harnessHome: liveHome, recentHives: [liveHome, path.join(appData, 'ok-home')] });
  const cfg = readConfig();
  assert.equal(cfg.harnessHome, forkDefaultHome(userData), 'live home must never reach the hive root');
  assert.deepEqual(cfg.recentHives, [path.join(appData, 'ok-home')]);
  resetFork();
});

test('(b) writeConfig and ensureHarnessHome refuse the live home', () => {
  resetFork();
  const mine = path.join(appData, 'mine');
  writeConfig({ harnessHome: mine });
  assert.equal(readConfig().harnessHome, mine);
  writeConfig({ harnessHome: liveHome });
  assert.equal(readConfig().harnessHome, mine, 'a refused write keeps the current home');
  assert.equal(JSON.parse(fs.readFileSync(forkConfig, 'utf8')).harnessHome, mine, 'never persisted');
  const ensured = ensureHarnessHome(liveHome);
  assert.equal(ensured.ok, false);
  assert.match(ensured.error, /installed Munder Difflin/);
  resetFork();
});

test('(b) no upstream install: nothing extra is refused', () => {
  const empty = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-fork-noup-')));
  try {
    assert.deepEqual(upstreamHomes(empty), []);
    assert.equal(checkForkHome(liveHome, empty).ok, true);
  } finally { fs.rmSync(empty, { recursive: true, force: true }); }
});

test('(c) Grok hooks are written to the fork file, never munder-hive.json', async (t) => {
  assert.equal(GROK_HOOK_FILE_NAME, 'munder-hive-fork.json');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'md-fork-grok-'));
  const home = path.join(base, 'user');
  const harness = path.join(base, 'harness');
  fs.mkdirSync(home, { recursive: true });
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const realHome = process.env.HOME;
  const realProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  t.after(() => {
    if (realHome === undefined) delete process.env.HOME; else process.env.HOME = realHome;
    if (realProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = realProfile;
  });
  assert.equal(os.homedir(), home, 'home redirect failed — aborting before touching the real ~/.grok');

  // An upstream hook file already present must be left exactly as it was.
  const hooks = path.join(home, '.grok', 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.writeFileSync(path.join(hooks, 'munder-hive.json'), 'UPSTREAM');

  const hive = new HiveManager(() => harness);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: harness });
  hive.installGrokHooks();

  assert.equal(fs.readFileSync(path.join(hooks, 'munder-hive.json'), 'utf8'), 'UPSTREAM');
  const mine = JSON.parse(fs.readFileSync(path.join(hooks, GROK_HOOK_FILE_NAME), 'utf8'));
  const cmd = mine.hooks.PreToolUse[0].hooks[0].command;
  assert.ok(cmd.includes(path.join(harness, 'hive', 'bin', 'grok-hook.cjs')), 'hook points at the fork hive');
});
