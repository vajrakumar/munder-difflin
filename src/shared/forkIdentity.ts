/**
 * Fork identity (MDF-4). Everything that would let this build collide with an
 * installed upstream Munder Difflin lives here, so the fork installs and runs
 * BESIDE /Applications/Munder Difflin.app instead of on top of it.
 *
 * The packaging half (appId, productName, version) is in electron-builder.yml.
 * The runtime half is below: the userData folder name (config, harness.db,
 * single-instance lock), the deep-link scheme, and the auto-updater switch.
 * Change these together with electron-builder.yml; RELEASING.md explains each.
 */

/** Folder under the OS appData dir (~/Library/Application Support on macOS).
 *  Upstream uses `munder-difflin`; sharing it would share config + hive. */
export const USER_DATA_DIR_NAME = 'munder-difflin-fork';

/** URL scheme for shareable-hire deep links. Upstream owns `munderdifflin`;
 *  registering the same scheme would steal its links (or lose ours). */
export const DEEP_LINK_SCHEME = 'munderdifflin-fork';

/** The upstream updater feed serves upstream builds. Installing one over the
 *  fork would swap it for an app that reads upstream's userData. Off until the
 *  fork has its own release feed. */
export const AUTO_UPDATE_ENABLED = false;

/** Default harness home, as a folder inside the fork's userData
 *  (~/Library/Application Support/munder-difflin-fork/harness-home). A fresh
 *  fork never starts with no home, so it can never inherit one by accident. */
export const FORK_HOME_DIR_NAME = 'harness-home';

/** The installed upstream app's userData folder name. The fork reads its
 *  config.json and floors/ to learn which harness homes are off limits
 *  (src/main/forkHome.ts). Read only: the fork never writes there. */
export const UPSTREAM_USER_DATA_DIR_NAME = 'munder-difflin';

/** Grok loads every file in ~/.grok/hooks. Upstream writes munder-hive.json;
 *  sharing that name meant whichever app ran a Grok agent last rewrote the
 *  other's hook to point at its own hive. */
export const GROK_HOOK_FILE_NAME = 'munder-hive-fork.json';
