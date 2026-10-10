/**
 * Fork identity (MDF-4, rebranded "Vajra's Office" in MDF-35).
 *
 * Display name: "Vajra's Office". Every machine identifier (bundle id,
 * executable, .app file name, userData folder, URL scheme, hook file) uses the
 * apostrophe-free slug `vajras-office`: an apostrophe in a path breaks any
 * shell or TOML string that single-quotes it. Everything that would let this build collide with an
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
/** Name people see (Dock, Finder, menus, installer). Machine ids use APP_SLUG. */
export const APP_DISPLAY_NAME = "Vajra's Office";

/** Apostrophe-free form of the name for every identifier and path. */
export const APP_SLUG = 'vajras-office';

export const USER_DATA_DIR_NAME = 'vajras-office';

/** URL scheme for shareable-hire deep links. Upstream owns `munderdifflin`;
 *  registering the same scheme would steal its links (or lose ours). */
export const DEEP_LINK_SCHEME = 'vajras-office';

/** The upstream updater feed serves upstream builds. Installing one over the
 *  fork would swap it for an app that reads upstream's userData. Off until the
 *  fork has its own release feed. */
export const AUTO_UPDATE_ENABLED = false;

/** Default harness home, as a folder inside the fork's userData
 *  (~/Library/Application Support/vajras-office/harness-home). A fresh
 *  fork never starts with no home, so it can never inherit one by accident. */
export const FORK_HOME_DIR_NAME = 'harness-home';

/** The installed upstream app's userData folder name. The fork reads its
 *  config.json and floors/ to learn which harness homes are off limits
 *  (src/main/forkHome.ts). Read only: the fork never writes there. */
export const UPSTREAM_USER_DATA_DIR_NAME = 'munder-difflin';

/** Grok loads every file in ~/.grok/hooks. Upstream writes munder-hive.json;
 *  sharing that name meant whichever app ran a Grok agent last rewrote the
 *  other's hook to point at its own hive. */
export const GROK_HOOK_FILE_NAME = 'vajras-office-hive.json';
