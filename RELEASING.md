# Releasing Vajra's Office (the fork; local, side-by-side)

How to build this fork as its own macOS app so it installs **beside**
`/Applications/Munder Difflin.app` (upstream, v0.5.5 on this machine) and never
overwrites that app or its data. Written 2026-10-10 for MDF-4.

Scope today: **local builds only.** No code signing with real certificates, no
notarization, no publishing, no auto-update feed.

## Fork identity

Two places define it. Change them together. The name people see, "Vajra's Office",
keeps its apostrophe. Every machine identifier and file name uses the
apostrophe-free slug `vajras-office` (or `Vajras Office` for the `.app`). An
apostrophe in a path breaks any shell or TOML string that single-quotes it.
`test/fork-identity.test.cjs` enforces this and checks the two files agree.

| What | Upstream | Fork | Where |
| --- | --- | --- | --- |
| Name people see | `Munder Difflin` | **Vajra's Office** (`CFBundleDisplayName`, `CFBundleName`, `extraMetadata.productName`, dmg title, Windows shortcut) | `electron-builder.yml`, `APP_DISPLAY_NAME` |
| Bundle id (`appId`) | `in.munderdiffl.app` | `com.vajras-office.app` | `electron-builder.yml` |
| `.app` file + executable (`productName`) | `Munder Difflin` | `Vajras Office` | `electron-builder.yml` |
| Packaged `package.json` name | `munder-difflin` | `vajras-office` (`extraMetadata`) | `electron-builder.yml` |
| Version | `0.5.5` | `0.6.0-fork.1` | `package.json` |
| Data folder (userData) | `~/Library/Application Support/munder-difflin` | `~/Library/Application Support/vajras-office` | `src/shared/forkIdentity.ts` |
| Deep-link scheme | `munderdifflin://` | `vajras-office://` | `forkIdentity.ts` + `electron-builder.yml` `protocols` |
| Auto-update | GitHub feed `chaitanyagiri/munder-difflin` | **off** (`publish: null`, `AUTO_UPDATE_ENABLED = false`) | both |
| Artifact names | `Munder-Difflin-<ver>-…` | `Vajras-Office-<ver>-…` |
| Default harness home | (none, onboarding asks) | `<data folder>/harness-home`; the installed app's homes are refused | `src/main/forkHome.ts` (MDF-36) |
| Grok hook file | `~/.grok/hooks/munder-hive.json` | `~/.grok/hooks/vajras-office-hive.json` | `GROK_HOOK_FILE_NAME` | `electron-builder.yml` |

Why each one matters:

- **Bundle id + app name**: a different `.app` name and id means macOS treats it as
  a separate app. Dragging it into `/Applications` cannot replace upstream.
- **Data folder**: holds `config.json`, `harness.db` and Electron's
  single-instance lock. A shared folder would share the hive config and would
  make one app quit the other on launch. The fork pins this folder in
  `src/main/index.ts` at startup. An explicit `--user-data-dir=…` (the isolated
  dev command in `FORK_NOTES.md`) still overrides it.
- **Deep-link scheme**: two apps on one scheme means macOS sends links to
  whichever registered last. Shareable-hire links made for upstream
  (`munderdifflin://hire?src=…`) do **not** open in the fork.
- **Auto-update off**: upstream's feed serves upstream builds. Installing one over
  the fork would turn it back into an app that reads upstream's data folder.
  Turn it back on only once the fork has its own release feed.

### Version scheme

`MAJOR.MINOR.PATCH-fork.N`. It starts at `0.6.0-fork.1`, one minor above the
installed upstream. Bump `N` for each local build you keep. When you rebase onto
a newer upstream, set `MAJOR.MINOR.PATCH` one minor above that upstream and reset
`N` to 1. Edit `version` in `package.json`. Nothing else reads it.

## Build

Prereqs: `npm install` done in this folder (see `FORK_NOTES.md`).

```bash
cd /Users/vajra/APILayer/myDifflin/munder-difflin
npm run dist:fork:mac        # unsigned .app, Apple silicon (arm64)
npm run dist:fork:mac:dmg    # same, packed as a .dmg
```

Output:

- `dist/mac-arm64/Vajras Office.app`
- `dist/Vajras-Office-0.6.0-fork.1-mac-arm64.dmg` (dmg script only; not built yet on this machine)

What the scripts do: `npm run build` (electron-vite), then electron-builder
for macOS arm64 only, with:

- `-c.mac.identity=null`: no code signing, even when a Developer ID cert sits
  in the keychain. `build/notarize.cjs` already skips when no `APPLE_*`
  variables are set. Do not set them.
- `-c.electronDist=node_modules/electron/dist`: reuses the Electron already
  installed by npm (32.3.3) rather than downloading it. The build then works
  offline and behind proxies that break TLS to GitHub.

Do **not** use `npm run dist` / `dist:mac` for the fork. They build the
universal + zip targets and try to sign.

## Install and run beside upstream

```bash
cp -R "dist/mac-arm64/Vajras Office.app" /Applications/
open "/Applications/Vajras Office.app"
```

Running it straight from `dist/` also works. A locally built app has no
quarantine flag, so Gatekeeper does not block it. If you copy it from another
machine, right-click → Open once.

**First run shows onboarding.** Pick a **new** harness home (for example
`~/MunderDifflinFork`). Never pick `/Users/vajra/APILayer/myDifflin`, which is the
live hive.

## Verify it is separate

```bash
APP="/Applications/Vajras Office.app/Contents"   # or dist/mac-arm64/…
/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" -c "Print :CFBundleShortVersionString" \
  -c "Print :CFBundleURLTypes:0:CFBundleURLSchemes:0" "$APP/Info.plist"
# → com.vajras-office.app / 0.6.0-fork.1 / vajras-office
ls ~/Library/Application\ Support/vajras-office   # appears after first launch
ps axo pid,command | grep "MacOS/Munder Difflin"        # both apps listed
```

Checked on 2026-10-10: the fork launched while upstream v0.5.5 kept running. It
created its own `munder-difflin-fork` folder (`harness.db`, `SingletonLock`).
Upstream's `config.json` was not modified. That launch predates the rebrand
(MDF-35) and the harness-home guard (MDF-36). Both are proven by tests only so
far: `test/fork-identity.test.cjs`, `test/fork-home.test.cjs`. The packaged
Info.plist was checked from an unlaunched build.

## Still shared with upstream (not isolated)

A different data folder does not cover these. They matter only once the fork
runs agents:

- `~/.claude/settings.json`: both apps set `skipDangerousModePermissionPrompt`
  there. Same value, so no conflict.
- Grok hooks: the fork writes its own `~/.grok/hooks/vajras-office-hive.json`.
  Grok still runs upstream's `munder-hive.json` for the fork's Grok agents too.
  Both route by the agent's own `HIVE_SOCK`, so events reach the right hive, but
  they can arrive twice.
- `~/.codex/sessions/munder-difflin/<hive-hash>/…`: keyed by hive path, so a
  different harness home keeps them apart.
- On first run, the fork reads the release page for `v0.6.0-fork.1` from
  upstream's GitHub repo, finds nothing, and moves on. This is harmless.

## Not done

- Signing with a real Developer ID, notarization, publishing, an update feed.
- Intel / universal builds, Windows and Linux. Their identity fields are set in
  `electron-builder.yml` but have not been built or tested.
- Icon: still upstream's. To rename again, change `APP_DISPLAY_NAME`/`APP_SLUG`
  and the identifiers in `src/shared/forkIdentity.ts`, plus `appId`,
  `productName`, `extraMetadata`, `mac.extendInfo` names, `protocols`,
  `dmg.title`, `nsis.shortcutName` and the `artifactName` prefixes in
  `electron-builder.yml`. Keep every identifier apostrophe-free and distinct from
  upstream. The identity test will tell you what you missed.

## Licences to carry into any build you share

- **Source: MIT** (`LICENSE`), © 2026 Chaitanya Giri. Keep the copyright and
  permission notice.
- **Pixel art: not MIT.** The tilesets and maps in `src/renderer/src/assets/`
  are LimeZu *Modern Interiors – RPG Tileset [16X16]* under its own licence
  (`LICENSE-ASSETS`). Commercial and non-commercial use are allowed. **Credit
  to LimeZu is required** (see `src/renderer/src/assets/ATTRIBUTION.md`). Keep
  that credit visible in any fork you distribute. Office-cast sprites are
  procedural (`portraitArt.ts`) and stay MIT.

## Test baseline

`npm run typecheck` passes. `npm run test:focused`: 936 pass, 24 fail. The
same 24 fail on unmodified `main` on this machine (environment: PTY, `~`
expansion, hook-spawn tests), so the fork changes add no failures.
