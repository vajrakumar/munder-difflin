# Fork notes — local clone of HarnessMD/munder-difflin

Local working copy for the human's own Vajra. Written 2026-10-10 as MDF-1.

## Where it lives

| What | Path |
| --- | --- |
| Clone | `/Users/vajra/APILayer/myDifflin/munder-difflin` |
| Git remote `origin` | `https://github.com/HarnessMD/munder-difflin.git` (upstream; no GitHub fork yet — MDF-5) |
| HEAD | `7f328156` (`seo-engine: day 12 AM…`, 2026-10-09) on `main` |
| `package.json` version | **0.4.6** |
| Live packaged app (do not touch) | Munder Difflin **v0.5.5** at `/Applications/Munder Difflin.app` |
| Live hive (do not touch) | `/Users/vajra/APILayer/myDifflin/hive` |
| Isolated Electron userData | `/Users/vajra/APILayer/myDifflin/.dev-munder-difflin-userData` |

The clone is **behind** the running packaged build (0.4.6 source vs 0.5.5 installed). Do not assume 0.5.5 behaviour from this tree.

## Stack

Electron 32 · electron-vite 2 · Vite 5 · React 18 · TypeScript 5 · Pixi.js 8 · xterm.js 5 · node-pty · better-sqlite3 · Zustand · i18next · Monaco / CodeMirror.

Two process planes: **main** (PTYs, hive, hooks, SQLite) and **renderer** (office floor + command center). Preload exposes a typed `window.cth` bridge.

## Folder map

```
munder-difflin/
  src/main/           Electron main: hive, PTY, hooks, config, updater, Slack, broker
  src/preload/        contextBridge → window.cth
  src/renderer/       React UI + Pixi office floor (src/renderer/src/)
  src/shared/         types/config shared by main + renderer
  test/               node:test suites (*.test.cjs)
  resources/          bundled skills, kg.cjs, Slack reply helper
  tools/              copy-main-assets, pty perms, agent-env
  scripts/            i18n merge, keepalive checks
  build/              icons, entitlements, notarize hook
  docs/               ARCHITECTURE.md, landing, media, hires gallery
  blog/               Eleventy marketing blog
  landing-remotion/   Remotion clips for the landing page
  hive/docs/          integration templates (not a live hive)
  HIVE.md SPEC.md DESIGN.md  product/design specs
  electron-builder.yml  packaged appId `in.munderdiffl.app`, productName `Munder Difflin`
```

Hive at runtime is **not** this `hive/` folder. It is created under `harnessHome` from onboarding, with config in Electron `userData/config.json`.

## Commands

Prereqs: Node 18+ (this machine: v22.18.0), npm, Xcode CLT. `npm install` rebuilds `node-pty` against Electron's ABI via `postinstall`.

```bash
cd /Users/vajra/APILayer/myDifflin/munder-difflin
npm install          # also: electron-rebuild, pty perms, conpty patch
```

**Dev (isolated from the live office — required):**

```bash
npx electron-vite -- --user-data-dir=/Users/vajra/APILayer/myDifflin/.dev-munder-difflin-userData
```

Equivalent: `npm run dev -- --user-data-dir=/Users/vajra/APILayer/myDifflin/.dev-munder-difflin-userData`

- Renderer: `http://127.0.0.1:5173/`
- First launch shows onboarding (no `config.json` yet in isolated userData). Pick a **new** harness home, never `/Users/vajra/APILayer/myDifflin`.
- Electron single-instance lock is keyed to userData; a shared data dir would quit this process or fight the packaged app.

Do **not** run bare `npm run dev`. That would use `~/Library/Application Support/munder-difflin` (the live app's userData) and can take the single-instance lock or write into the live hive.

| Script | What |
| --- | --- |
| `npm run build` | `electron-vite build` + copy main `.cjs` sidecars |
| `npm run preview` | preview the production build |
| `npm run typecheck` | `tsc --noEmit` for node + web tsconfigs |
| `npm run test:focused` | `node --test test/*.test.cjs` |
| `npm run dist` / `dist:mac` | electron-builder package (do not install over `/Applications/Munder Difflin.app`) |

Dev log from the MDF-1 launch: `~/.grok/long-running-background-tasks/md-dev.log`.

## Licence

**Source: MIT** (`LICENSE`) — Copyright 2026 Chaitanya Giri. Use, copy, modify, merge, publish, distribute, sublicense, and sell, with the copyright + permission notice kept. No warranty.

**Bundled pixel art is not MIT.** `LICENSE-ASSETS`: tilesets/maps under `src/renderer/src/assets/` are LimeZu *Modern Interiors - RPG Tileset [16X16]*, Complete Version licence. Commercial and non-commercial use and editing are allowed; **credit to LimeZu is required** (see `src/renderer/src/assets/ATTRIBUTION.md`). Office-cast sprites are procedural (`portraitArt.ts`) and stay MIT.

A GitHub fork (MDF-5) is still waiting on the human. No remotes were added besides `origin` → upstream. Nothing was pushed.

## Isolation used on 2026-10-10

- userData: `/Users/vajra/APILayer/myDifflin/.dev-munder-difflin-userData` (harness.db + Electron caches; no config.json yet)
- Renderer port 5173 (was free; packaged app does not bind it)
- Packaged app still running with `--user-data-dir=/Users/vajra/Library/Application Support/munder-difflin`
- Live hive `log.jsonl` continued independently; this clone did not write there

## What failed / warnings

- `posthog-node@5.48.2` EBADENGINE: wants Node `^20.20.0 \|\| >=22.22.0`; this machine is **v22.18.0**. Install still completed; analytics is compile-time no-op without `POSTHOG_KEY`.
- `npm audit`: 38 issues (9 moderate, 27 high, 2 critical). Not fixed.
- Deprecated transitive deps (`glob`, `rimraf`, `multer@1`, `tar@6`, …) from the lockfile. Not fixed.
- First-run onboarding is still on screen in the isolated window (expected). Completing it needs a **new** harness home so it never points at the live hive.
- Source tree is 0.4.6; feature-gap work against 0.5.5 Pro must not assume this checkout already has those files.
