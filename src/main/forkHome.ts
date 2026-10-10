import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { FORK_HOME_DIR_NAME, UPSTREAM_USER_DATA_DIR_NAME } from '../shared/forkIdentity';
import { expandTilde } from './fs';

/**
 * MDF-36: the fork must never open the installed app's hive.
 *
 * userData isolation alone did not stop it: a config.json carried
 * harnessHome=/Users/vajra/APILayer/myDifflin, the hive root is just
 * join(harnessHome, 'hive'), and the fork booted every hive service against the
 * live office (archived its agents, rewrote its registry). So the harness home
 * itself is now checked against every home the installed app uses, and an empty
 * or refused home falls back to the fork's own folder.
 */

/** The fork's own default harness home, inside its userData folder. */
export function forkDefaultHome(userDataDir: string): string {
  return join(userDataDir, FORK_HOME_DIR_NAME);
}

/** Canonical form for comparison: ~ expanded, absolute, symlinks resolved where
 *  the path exists (so /tmp vs /private/tmp or a symlinked alias still match). */
function canon(p: string): string {
  const abs = resolve(expandTilde(p));
  try { return realpathSync(abs); } catch { return abs; }
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(readFileSync(path, 'utf8'));
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}

function homesIn(cfg: Record<string, unknown> | null, out: Set<string>): void {
  if (!cfg) return;
  if (typeof cfg.harnessHome === 'string' && cfg.harnessHome.trim()) out.add(canon(cfg.harnessHome));
  if (Array.isArray(cfg.recentHives)) {
    for (const h of cfg.recentHives) if (typeof h === 'string' && h.trim()) out.add(canon(h));
  }
}

/**
 * Every harness home the installed upstream app uses or has used, read from
 * <appData>/munder-difflin: its config.json, each floors/<id>/config.json, and
 * the floor lock (floor-numbers.json → dataDir/config.json) for floors that live
 * elsewhere. Missing or unreadable files contribute nothing; never throws.
 */
export function upstreamHomes(appDataDir: string): string[] {
  const root = join(appDataDir, UPSTREAM_USER_DATA_DIR_NAME);
  const out = new Set<string>();
  homesIn(readJson(join(root, 'config.json')), out);
  const floors = join(root, 'floors');
  if (existsSync(floors)) {
    try {
      for (const id of readdirSync(floors)) homesIn(readJson(join(floors, id, 'config.json')), out);
    } catch { /* unreadable floors dir: config.json above still counts */ }
  }
  const lock = readJson(join(root, 'floor-numbers.json'));
  if (lock) {
    for (const entry of Object.values(lock)) {
      const dataDir = entry && typeof entry === 'object' ? (entry as { dataDir?: unknown }).dataDir : undefined;
      if (typeof dataDir === 'string' && dataDir) homesIn(readJson(join(dataDir, 'config.json')), out);
    }
  }
  return [...out];
}

export type ForkHomeCheck = { ok: true } | { ok: false; error: string };

/**
 * Refuse a harness home that the installed app uses, or one inside the
 * installed app's own userData folder. An exact match is what corrupts the live
 * hive (same hive/, same hooks.sock); a different folder, even a sibling or a
 * subfolder of the live home, gets its own hive/ and is allowed.
 */
export function checkForkHome(candidate: string, appDataDir: string): ForkHomeCheck {
  if (typeof candidate !== 'string' || !candidate.trim()) return { ok: false, error: 'empty harness home' };
  const c = canon(candidate);
  const upstreamData = canon(join(appDataDir, UPSTREAM_USER_DATA_DIR_NAME));
  if (c === upstreamData || c.startsWith(upstreamData + sep)) {
    return { ok: false, error: `${c} is inside the installed Munder Difflin's data folder. Pick another folder.` };
  }
  if (upstreamHomes(appDataDir).includes(c)) {
    return { ok: false, error: `${c} is the installed Munder Difflin's harness home. The fork must use its own folder.` };
  }
  return { ok: true };
}

/**
 * The harness home the fork may actually use: the stored one if it passes
 * checkForkHome, otherwise the fork's default. `refused` carries why a stored
 * home was replaced, so the caller can log it.
 */
export function pinForkHome(
  stored: string | null | undefined,
  userDataDir: string,
  appDataDir: string
): { home: string; refused?: string } {
  const fallback = forkDefaultHome(userDataDir);
  if (typeof stored !== 'string' || !stored.trim()) return { home: fallback };
  const check = checkForkHome(stored, appDataDir);
  return check.ok ? { home: stored } : { home: fallback, refused: check.error };
}
