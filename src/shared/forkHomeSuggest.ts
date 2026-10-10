import { FORK_HOME_DIR_NAME, USER_DATA_DIR_NAME } from './forkIdentity';

/**
 * First-run Home default (MDF-48). The fork's pinned hive lives under its own
 * userData as `FORK_HOME_DIR_NAME` (`harness-home`), never `~/HarnessAgents`
 * (that path creates a third hive beside the live office and the fork home).
 *
 * Display form with `~` / `%APPDATA%` so the field is readable; main expands
 * tildes at the config-write boundary.
 */
export function suggestedForkHome(platform?: string): string {
  const p = platform
    ?? (typeof process !== 'undefined' && typeof process.platform === 'string'
      ? process.platform
      : 'darwin');
  if (p === 'win32') return `%APPDATA%\\${USER_DATA_DIR_NAME}\\${FORK_HOME_DIR_NAME}`;
  if (p === 'linux') return `~/.config/${USER_DATA_DIR_NAME}/${FORK_HOME_DIR_NAME}`;
  return `~/Library/Application Support/${USER_DATA_DIR_NAME}/${FORK_HOME_DIR_NAME}`;
}
