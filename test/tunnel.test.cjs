'use strict';

/**
 * MDF-43: the Slack and webhook servers reach the internet through tunnelmole.
 * Its audit findings came from two dependencies it declares but never loads
 * (`toml`, `@types/jest`), so package.json `overrides` swap them for safe
 * releases, and the unused `localtunnel` is gone. These tests prove:
 *   - the overrides are what tunnelmole actually resolves,
 *   - tunnelmole still loads the way slack.ts / webhook.ts load it,
 *   - (opt-in, MD_TUNNEL_LIVE=1) a real request crosses the public tunnel and
 *     reaches each server's own handler. Off by default: unit runs never touch
 *     the network.
 *
 * Live run: MD_TUNNEL_LIVE=1 node --test --test-force-exit test/tunnel.test.cjs
 * (tunnelmole has no close handle, so its socket keeps Node alive without
 * --test-force-exit).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { createRequire } = require('node:module');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tunnelmoleDir = path.dirname(require.resolve('tunnelmole/package.json'));
const fromTunnelmole = createRequire(path.join(tunnelmoleDir, 'package.json'));
// Read a dependency's package.json the way Node would find it from tunnelmole
// (its own node_modules first, then the root's), without going through
// `exports`, which may not expose package.json.
function depPackageJson(name) {
  for (const dir of [path.join(tunnelmoleDir, 'node_modules', name), path.join(root, 'node_modules', name)]) {
    const p = path.join(dir, 'package.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  throw new Error(`${name} is not installed for tunnelmole`);
}

test('localtunnel is gone from the dependency list', () => {
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.equal(all.localtunnel, undefined);
  assert.equal(all['@types/localtunnel'], undefined);
  assert.throws(() => require.resolve('localtunnel'), /Cannot find module/);
});

test("tunnelmole resolves the overridden toml and @types/jest, not the flagged ones", () => {
  assert.deepEqual(pkg.overrides.tunnelmole, { toml: 'npm:@iarna/toml@2.2.5', '@types/jest': '30.0.0' });
  assert.equal(depPackageJson('toml').name, '@iarna/toml');
  // If tunnelmole ever does parse TOML, the stand-in has the same parse() API.
  assert.deepEqual(fromTunnelmole('toml').parse('a = 1\n[b]\nc = "d"\n'), { a: 1, b: { c: 'd' } });
  assert.equal(depPackageJson('@types/jest').version, '30.0.0');
});

test('tunnelmole still loads the way slack.ts and webhook.ts load it', async () => {
  const mod = await import('tunnelmole');
  assert.equal(typeof mod.tunnelmole, 'function');
});

// ---- live round trip (opt-in) ----------------------------------------------

const LIVE = process.env.MD_TUNNEL_LIVE === '1';

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

async function postThroughTunnel(url, body) {
  // A fresh tunnel can take a moment before the edge routes to it.
  let last;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (res.status !== 502 && res.status !== 503) return res;
      last = new Error(`edge answered ${res.status}`);
    } catch (e) { last = e; }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw last;
}

test('live: a webhook POST crosses the tunnel and reaches our handler', { skip: !LIVE, timeout: 60_000 }, async () => {
  const { WebhookServer } = loadTs('src/main/webhook.ts');
  const server = new WebhookServer({
    port: await freePort(),
    endpoints: [{ id: 'alpha', name: 'Alpha', secret: 'a'.repeat(64), schema: '{}' }],
    onMessage: () => { throw new Error('an unsigned request must never be dispatched'); },
    lookupStatus: () => null
  });
  try {
    const started = await server.start();
    assert.equal(started.ok, true, started.error);
    assert.match(started.url, /^https:\/\//);
    const res = await postThroughTunnel(`${started.url}/alpha`, '{"message":"hi"}');
    assert.equal(res.status, 401, 'our handler rejects the missing secret');
    assert.equal((await res.json()).ok, false);
  } finally { server.stop(); }
});

test('live: a Slack event POST crosses the tunnel and hits signature checking', { skip: !LIVE, timeout: 60_000 }, async () => {
  const { SlackWebhookServer } = loadTs('src/main/slack.ts');
  const server = new SlackWebhookServer({
    port: await freePort(),
    signingSecret: 's'.repeat(32),
    onMessage: () => { throw new Error('an unsigned Slack event must never be dispatched'); }
  });
  try {
    const started = await server.start();
    assert.equal(started.ok, true, started.error);
    const res = await postThroughTunnel(started.url, '{"type":"event_callback"}');
    assert.equal(res.status, 403, 'slack.ts answers 403 to a missing/invalid Slack signature');
  } finally { server.stop(); }
});
