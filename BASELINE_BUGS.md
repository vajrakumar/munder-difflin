# Baseline bugs — local fork smoke (MDF-3)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied**

## Build under test

| Item | Value |
| --- | --- |
| Tree | `/Users/vajra/APILayer/myDifflin/munder-difflin` on `main` (`7f328156` + dirty: `package.json` 0.4.6→**0.6.0-fork.1**, `electron-builder.yml`, `src/main/index.ts`, `updater.ts`, `hire.ts`) |
| Launch | `npx electron-vite -- --user-data-dir=/Users/vajra/APILayer/myDifflin/.dev-munder-difflin-userData --remote-debugging-port=9333` |
| Isolated hive (after recovery) | `/Users/vajra/APILayer/myDifflin/.dev-hive` |
| Packaged app (not touched) | v0.5.5 `/Applications/Munder Difflin.app` |
| Unit tests | `npm run test:focused` — **964 pass, 1 skipped, 0 fail** (60.7s) |
| UI | CDP screenshots in `/tmp/mdf3-smoke/` |

Onboarding wizard was **not** driven end-to-end this run: isolated `userData` already had `onboardingComplete: true` before the CDP session. Hive picker → office → Command Center tabs, Settings, Add Agent were exercised.

---

## P0

### B-1 · Isolated `--user-data-dir` still attached to the **live** hive

**Flow:** first-run / leftover isolated Electron (and the MDF-3 relaunch before home was retargeted).  
**Steps:**
1. Start the fork with `--user-data-dir=/Users/vajra/APILayer/myDifflin/.dev-munder-difflin-userData` as FORK_NOTES requires.
2. Observe `userData/config.json` (already present from an earlier onboarding) with `"harnessHome": "/Users/vajra/APILayer/myDifflin"`.
3. App boots hive services against the **live** office.

**Expected:** fork never reads or writes `/Users/vajra/APILayer/myDifflin/hive` or `roster.json`.  
**Actual:**
- Hook bind against live `hive/hooks.sock` (`EADDRINUSE`); every hook **allowed**, no cost recorded.
- Live `log.jsonl` received `app-start` for `0.4.6` and `0.6.0-fork.1` (`packaged: false`).
- Live registry: god renamed **Michael → Vajra**, `provider` flipped to **grok**, `archived: true`.
- Live log `archive` events for **developer, tester, dwight, phyllis, god**.
- Two crash logs under live `hive/crashes/` — grok tried to restore live session `c412b739-…` and 404'd.
- Live `roster.json` rewritten (mtime 19:19:51).

Evidence: `/tmp/mdf3-logs/config-contaminated.json`, live `hive/log.jsonl`, `hive/registry.json` (`god.archived: true`, `name: "Vajra"`).

**Severity: P0 (live office data corruption).** Tester stopped the isolated process, retargeted `harnessHome` to `.dev-hive` for the rest of the smoke, and did **not** repair the live registry (god owns that).

After retarget, isolation worked: `.dev-hive/hive/hooks.sock` listening, `.dev-hive` log only has its own `app-start` / spawn.

### B-2 · `--user-data-dir` does not prevent a wrong `harnessHome`

**Flow:** isolation contract.  
**Expected:** isolated userData + a missing/wrong home cannot latch onto an already-running hive next door.  
**Actual:** hive root is `join(harnessHome, 'hive')` with no check that the directory is not the live office. Onboarding default is `~/HarnessAgents`, but a completed config in this userData pointed at `/Users/vajra/APILayer/myDifflin` (parent of the clone). Folder-picker / hive-picker makes that an easy mis-click.

**Severity: P0** (same blast radius as B-1).

---

## P1

### B-3 · Grok orchestrator + Claude model id in contaminated config

**Flow:** onboarding / config.  
**Expected:** `godModel` belongs to `godProvider`.  
**Actual:** `godProvider: "grok"` with `godModel: "claude-opus-4-8"`. Isolated Michael then spawned grok and immediately ran tools (`list_dir`) in `.dev-hive`.

**Severity: P1**

### B-4 · Grok TUI in Command Center terminal is garbled

**Flow:** Command Center → terminal, first-run Michael (grok 4.6).  
**Steps:** Open hive → terminal tab (default).  
**Expected:** readable xterm session, prompt and queue composer usable.  
**Actual:** box-drawing / wrap broken (“Y a You're online as Michael…”), a 6-line paste sitting in the grok prompt, “Tight on space? Try /compact-mode”, composer shows `6rok 4.6 (high) · always-approve`. Screenshot: `/tmp/mdf3-smoke/03-after-open.png`.

**Severity: P1** (core “watch the clone” surface).

### B-5 · Tasks kanban clips the BLOCKED / DONE columns

**Flow:** Command Center → tasks.  
**Expected:** TODO / DOING / BLOCKED / DONE all visible or an obvious horizontal affordance.  
**Actual:** header shows `TODO 0 | DOING 0 | BLOCK` cut off; DONE not visible in a 1440×900 window with the floor occupying the left. Screenshot: `/tmp/mdf3-smoke/tab-tasks.png`.

**Severity: P1** (layout).

### B-6 · Settings and Add Agent stack; no focus trap

**Flow:** Settings → Add Agent without closing Settings.  
**Expected:** one modal, or Add Agent disabled while Settings is open; focus trapped.  
**Actual:** Add Agent opens on top of Settings; Settings **save / close** still visible and clickable underneath. Screenshot: `/tmp/mdf3-smoke/05-add.png`.

**Severity: P1** (a11y + input routing).

---

## P2

### B-7 · Hive-picker chrome is pixel / Press Start 2P (baseline, pre-MDF-6)

**Flow:** launch with onboarding complete.  
**Expected (PLAN.md):** no Press Start 2P.  
**Actual:** “SELECT A HARNESS CONFIG”, `.dev-hive` title, and many CC labels use Press Start 2P. Cream diagonal hatch background. This is the **current** look; filed as baseline so UI rewrite can close it.

**Severity: P2** (known; roadmap P0 UI).

### B-8 · ASK ME empty-state copy fails contrast

**Flow:** Command Center → ask me.  
**Expected:** WCAG 2.2 AA for body text.  
**Actual:** lilac-grey sentence on cream (`rgb(107,88,120)`-class on `rgb(255,248,231)`), 12px. Screenshot: `/tmp/mdf3-smoke/tab-ask me.png`.

**Severity: P2** (a11y).

### B-9 · Agent strip truncates the orchestrator name to `MICH..`

**Flow:** office, bottom roster card.  
**Expected:** “Michael” readable.  
**Actual:** `MICH..` with BOSS chip. Card is wide enough for the full name.

**Severity: P2**

### B-10 · Two “memory” entry points; header 🧠 memory is not the CC tab

**Flow:** click “memory”.  
**Expected:** Command Center memory tab.  
**Actual:** floor overlay “HIVE MEMORY / Not set up / Meaning-based search isn't installed yet” covers the Pixi scene and stays up across later tab clicks (triggers, workers, graph). CC memory tab (text + semantic search + file) is a different surface.

**Severity: P2**

### B-11 · Settings still sells Munder Difflin Pro / Founders' Wall

**Flow:** Settings → General.  
**Expected:** local fork, everything unlocked, no paid upsell (PLAN.md P15 skip).  
**Actual:** “v0.5.0 launches with Munder Difflin Pro”, “50% off … first 100 people on the wall”, Discord/GitHub CTAs. Home folder correctly shows `.dev-hive`. Screenshot: `/tmp/mdf3-smoke/04-settings.png`.

**Severity: P2** (product copy).

### B-12 · HISTORY tab absent from Command Center

**Flow:** CC tab bar.  
**Expected (PLAN / CommandCenterPanel):** history tab when `showHistory`.  
**Actual:** 11 tabs, no History. Empty-hive may hide it; still a baseline gap vs the 12-tab copy in onboarding (“Terminal · Floor · Memory · Activity · Tasks · Triggers”).

**Severity: P2**

### B-13 · Talk is disabled; only an info popover

**Flow:** agent card → talk.  
**Expected:** working dictation, or a Settings path that actually enables it.  
**Actual:** “Why is Talk disabled?”; Voice in Settings not completed this run. Free Flow default on in config but no Groq key.

**Severity: P2** (voice not in this smoke’s must-pass; still a core control).

### B-14 · MemPalace “not set up” on a fresh hive

**Flow:** memory overlay / CC memory.  
**Expected:** first-run either installs MiniLM or hides semantic search.  
**Actual:** “Meaning-based search isn't installed yet” + Prerequisites CTA. Text search of `memory.md` works.

**Severity: P2**

### B-15 · Focus ring on hive picker is 1px lilac

**Flow:** Tab from hive picker.  
**Expected:** 3:1 non-text contrast, clearly visible.  
**Actual:** `outline: rgb(168, 153, 181) solid 1px` plus inset shadow. Active element after 8 Tabs: “open existing config…”. Unnamed interactive AX nodes on picker: 0 (good).

**Severity: P2** (a11y).

### B-16 · `npm audit` / engine warnings (from MDF-1, still true)

FORK_NOTES: 38 audit issues (9 moderate, 27 high, 2 critical); `posthog-node` EBADENGINE on Node v22.18.0. Not re-run as a blocker.

**Severity: P2** (supply chain).

---

## Flows that passed

| Flow | Result |
| --- | --- |
| Isolated relaunch with `harnessHome=.dev-hive` | Own `hooks.sock`, own `log.jsonl`, own Michael. Live hive stopped receiving fork `app-start` after retarget. |
| Hive picker | Shows current `.dev-hive`; Open enters office. |
| Office floor | Pixi map, Michael walks, tool bubble (`using list_dir` / `running the floor`). |
| CC tabs | terminal, monitor, tasks, ask me, triggers (schedules/context/webhooks/org), memory (file), graph (Michael node + legend), activity, skills (19 installed), workers (0/4 empty). |
| Settings | 7 sections listed; one Save; home folder `.dev-hive`. |
| Add Agent | Identity step: Office characters + colour chips; spawn/cancel. Not spawned. |
| Keyboard | Tab moves focus on hive picker. |
| Unit tests | 964 pass / 1 skip / 0 fail. |

---

## Isolation notes for the next tester

- Never complete onboarding (or hive picker “open existing”) against `/Users/vajra/APILayer/myDifflin`.
- After a bad home, **quit** the fork before changing `config.json`; a running instance keeps writing the live log.
- Packaged v0.5.5 and `Munder Difflin Fork.app` under `dist/mac-arm64/` were left running; do not kill them.
- Live registry still has `god.archived: true` and `name: "Vajra"` as of this report — **god must repair**; Tester did not write live hive files.

## Counts

- P0: 2
- P1: 4
- P2: 10
- Flows passed: 8
- Unit: 964 pass / 1 skip / 0 fail

---

## MDF-6/7 UI review

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · browser only (no Electron)

| Item | Value |
| --- | --- |
| Tree | gallery worktree `munder-difflin-ui` at http://127.0.0.1:5179/gallery.html (`npm run gallery`) |
| Tokens | `docs/paper-preview.html` via `file://` (the gallery origin maps `/docs/paper-preview.html` to the app shell) |
| Evidence | `/tmp/mdf67-smoke/` (gallery, paper.html, token board) |

### Keyboard reach and focus rings

Tab reaches theme toggles, buttons, Query input, Radix Select, Combobox trigger, tabs, Menu, Dialog, Sheet, EmptyState action, Splitter handle. Global rule `html[data-paper-theme] :focus-visible` paints `--paper-focus-ring` (double surface+accent). Confirmed on Ghost, Open sheet, Queue hire, Combobox filter, Select items, nav links, sidebar handle. Radix Select opens with click/keyboard and arrows through Claude/Grok/Codex. Dialog and Sheet take focus; **Escape closes both**. IconButton Search has `aria-label`. Query is wired with `<Label htmlFor="q">`.

**P1 B-67-1 · Combobox options are mouse-only.** `src/renderer/src/ui/Combobox.tsx`: list rows are `<div class="paper-combobox-item">` with `onMouseDown` only — no `role="option"`, no `tabIndex`, no Arrow/Enter/Space handler. Opening the Michael combobox moves focus into an unlabeled filter `<Input>`; ArrowDown does not highlight Developer/Tester. Keyboard users cannot change the value.

**Verified 2026-10-10 (MDF-41 `2da54fbe` / merge `e1273f52`).** Gallery Combobox trigger `aria-haspopup="listbox"`; open list is `role="listbox"` with `role="option"` rows; ArrowDown highlights Tester (`data-highlighted`); Enter commits the trigger to “Tester”. Evidence `/tmp/mdf41-verify/`.

### Contrast (WCAG 2.2 AA) — light / dark / hc

OKLCH semantic pairs, measured from computed tokens (sRGB conversion):

| Pair | light | dark | hc (AA 7:1 body) |
| --- | --- | --- | --- |
| `--paper-text` on `--paper-bg` | 17.54 | 16.09 | 21.00 |
| `--paper-text-muted` on bg | 6.68 | 8.93 | 14.59 |
| primary button text on `--paper-accent-9` | 6.03 | 6.57 | ≥ AA |
| danger button text on `--paper-danger-9` | 5.10 | ≥ AA | ≥ AA |

Body, muted, primary, danger, and badge text pass AA in all three themes. HC body meets the 7:1 gate. No Press Start 2P on Paper surfaces (computed `h1` is Inter). Token board (`file://` preview) Light/Dark/High contrast swatches match DESIGN.md.

**P2 B-67-2 · Ghost button has no resting boundary.** `.paper-btn-ghost` is transparent fill and `border-color: transparent`. Unfocused Ghost is indistinguishable from body text (WCAG 1.4.11 3:1 for UI components). Focus ring is fine.

### Screen reader labels

IconButton requires `label` and sets `aria-label` + `title`. Dialog title “Hire an agent” and Sheet title “Ticket MDF-7” come from Radix Title. Toast uses Radix Title. Combobox trigger name is the selected value (“Michael”).

**P2 B-67-3 · Select/Combobox have no label API.** `Select.tsx` / `Combobox.tsx` do not take `aria-label`, `id`, or a `<Label>`. Gallery Select is a combobox whose name is only the current value “Claude”. Combobox filter input inside the popover is unlabeled.

**P2 B-67-4 · StatusRing status is title-only.** `Avatar.tsx` `StatusRing` sets `title={status}` and `data-status`; no `aria-label` / `role`. Avatar itself has `aria-label={name}`. SR users hear the initials, not idle/working/blocked.

**P2 B-67-5 · Splitter handle is an unnamed separator.** `role="separator"` `aria-orientation="vertical"` `aria-valuenow` `tabIndex=0`, no `aria-label`. Keys are physical `ArrowLeft` / `ArrowRight`.

### Visual polish

Gallery (light/dark/hc): Inter, warm paper, indigo accent, calm density. Identity row: distinct avatar hues + status rings (idle / working amber / blocked red / thinking blue). Card, table, empty state (“Inbox zero”), splitter, toast (“Saved”) look finished. HC thickens chrome. Dialog overlay + sheet from the right are clean.

**P2 B-67-6 · Dialog and Sheet have no visible close control.** `DialogContent` / `SheetContent` render Title (+ Description) and children only. Escape and overlay click work; there is no X / Close.

**P2 B-67-7 · Sheet and dialog positioning is physical, not logical.** `.paper-sheet { right: 0; border-left: … }`. `.paper-dialog { left: 50%; }`. DESIGN §8 asks for logical properties for RTL.

**P2 B-67-8 · Skeleton uses a gradient.** `.paper-skel` is `linear-gradient(...)` + animation. DESIGN: “no gradients on chrome”. `prefers-reduced-motion` stops the animation.

**P2 B-67-9 · Gallery theme toggles have no `aria-pressed`.** Token board buttons do. Gallery also has no skip-to-content (DESIGN quality gate). Demo-page only.

### MDF-6/7 counts

- P0: 0
- P1: 1 (Combobox keyboard)
- P2: 8

---

## MDF-8/9/10 UI review

Same session, god inform conv-76bc41. Browser only. `http://127.0.0.1:5179/paper.html` (and fork/main on :5180 for the palette, which the live gallery HMR also picked up).

### App shell (MDF-8)

Title bar, resizable sidebar, hash router (`#/inbox`, `#/agent/developer-mv2fn62v`), inspector, Classic UI control, theme cycle. `min-width: 1024px; min-height: 640px`. Tab reaches Search, theme, Classic UI, inspector toggle, nav links, agent rows, handle. Enter on Inbox sets `aria-current="page"` and swaps the main heading. Handle ArrowLeft collapses to the icon rail; ArrowRight restores. No Press Start. Reduced-motion tokens apply (`--paper-duration-*` → 0.01ms).

**P1 B-810-1 · Collapsed sidebar nav links have no accessible name.** At width ≤ 72px, `.paper-nav` keeps the Lucide icon and drops the text. No `aria-label`. Home / Inbox / Tasks / … become empty links. Collapsed agent rows still contain `Avatar aria-label={name}`.

**Verified 2026-10-10 (MDF-41).** At sidebar width 64px (`data-collapsed=true`), all eight workspace nav links expose `aria-label` (Home, Inbox, Tasks, Automations, Memory, Capabilities, Temps, Stapler). Unnamed count: 0. Screenshot `/tmp/mdf41-verify/03-collapsed-nav.png`.

**P2 B-810-2 · Sidebar handle is unnamed; keys are physical.** Same pattern as the gallery Splitter. Focus fill `--paper-accent-8` is strong (a full-height blue bar).

**P2 B-810-3 · Agent live-status text clips.** “idle” → “idl”, “working” → “workin”, “waiting” → “waitin” in the default 248px sidebar.

**P2 B-810-4 · Shell skip-to-content is missing.** Theme control’s accessible name is the current value (`light` / `dark` / `hc`), not a “Switch theme” name. Search button has visible text “Search or jump”.

### ⌘K palette (MDF-9)

⌘K and the title-bar Search button open a `role="dialog"` `aria-label="Command palette"` with 15 actions. Input autofocuses; ArrowUp/Down move `data-active`; Enter runs; Escape closes. Filter “inbox” narrows the list. Overlay click closes.

**P1 B-810-5 · Palette does not trap Tab.** Overlay is a full-viewport `<button aria-label="Close palette">` in the tab order. After the last action, Tab continues into the title bar / sidebar behind the dimmed overlay (Classic UI, nav). Custom dialog, not Radix.

**Verified 2026-10-10 (MDF-41).** Overlay `tabIndex=-1`. Palette `role="dialog"` `aria-modal="true"`. Search field `aria-label="Search or jump"`. Eight Tab keypresses stayed on `.paper-palette-input` (0 leaks into title bar / sidebar). Escape closes. Screenshot `/tmp/mdf41-verify/04-palette.png`.

**P2 B-810-6 · Palette search field has no accessible name** (placeholder “Search or jump…” only). Action rows are `<button>`s, not `listbox`/`option`. No `aria-activedescendant`.

**P2 B-810-7 · Filter ranks Home for the query “inbox”.** `actions.ts` gives Home keywords `home inbox floor`, so “inbox” lists **Go to Home** above **Go to Inbox**.

### Avatars and status rings (MDF-10)

Initials + stable hue (`hueFromName`) + `StatusRing` (`idle` / `working` / `waiting` / `blocked` / `thinking`). Gallery Identity and sidebar agent rows match the DESIGN colour language. Rings freeze under `prefers-reduced-motion`. Working/blocked/thinking rings are easy to tell apart; idle is a quiet neutral.

Status not exposed to SR: see B-67-4.

### Token board serving

**P2 B-810-8 · `http://localhost:5179/docs/paper-preview.html` is not the token board.** Vite SPA fallback serves the app shell (blank, title “Munder Difflin”). The real board is `munder-difflin-ui/docs/paper-preview.html` (`file://`). Theme group uses `aria-pressed`. Light/dark/hc swatches look correct. Numerals on solid steps 11–12 stay `--paper-neutral-12` and go quiet on the dark fills (only steps 9–10 flip to `on-solid`).

### MDF-8/9/10 counts

- P0: 0
- P1: 2 (collapsed nav names; palette focus trap)
- P2: 7

### Combined UI review counts (MDF-6 through MDF-10)

- P0: 0
- P1: 3
- P2: 15
- Electron: not launched

---

## Packaged app smoke (8b829b58)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied**

| Item | Value |
| --- | --- |
| Commit | `8b829b58` `fork: keep CFBundleName = productName so the app launches` (contains MDF-36 pin `31f9bfa2`) |
| App | `/Users/vajra/APILayer/myDifflin/munder-difflin/dist/mac-arm64/Vajras Office.app` · mtime 2026-10-10T14:20:05Z · **0.6.0-fork.1** · id `com.vajras-office.app` · binary `Vajras Office` |
| userData | `~/Library/Application Support/vajras-office` |
| Packaged hive | `~/Library/Application Support/vajras-office/harness-home` |
| Launch | `"…/Vajras Office.app/Contents/MacOS/Vajras Office" --remote-debugging-port=9335` (pid 35460) |
| Installed app (untouched) | v0.5.5 `/Applications/Munder Difflin.app` pid 55356 still running after fork quit |
| Evidence | `/tmp/mdf-pkg-smoke/` |

### Isolation (gate)

Live `/Users/vajra/APILayer/myDifflin/hive/log.jsonl` snapshot before launch: **166** lines. After onboarding + spawn + Paper/classic + quit: **243** lines, **+77**. New kinds were `message` / `pty-submit` / `spawn` / `session` / `archive` / `tasks-keyed` from the **installed** office. **Fork `app-start` / `Vajras` / `vajras-office` / `0.6.0-fork` hits: 0.** Did not quit for contamination.

Packaged hive `log.jsonl` recorded its own `app-start` (`version: 0.6.0-fork.1`, `packaged: true`, `appPath` the dist asar), `hooks` on the vajras-office sock, then `spawn` Michael (`god`) and Pam (`pam-mv2htw6i`).

`config.json` after: `harnessHome` = `…/vajras-office/harness-home`, `onboardingComplete: true`. Not the live tree, not `~/HarnessAgents`.

### What passed

- Launches **beside** the installed app (two windows; two userData folders; two bundle ids).
- First-run onboarding: technical → set it up → home (Tester overrode the default; see B-pkg-3) → engine Claude Opus 4.8 1M → skip repos → auto mode → Finish. Landed on classic Command Center. Michael spawned.
- Add Agent: name **Pam**, character Pam, cwd = harness-home, spawn succeeded (`pty-pam-mv2htw6i`). Roster showed PAM + MICHAEL.
- Classic is the default (`isClassicUi()` true, pixel office + canvas).
- Paper via `?paper=1` + `localStorage paper.classicUi='0'`: `.paper-shell`, theme light, h1 Home, **Classic UI** title-bar button. Screenshot `15-paper.png`.
- Title-bar **Classic UI** click sets `paper.classicUi='1'` and strips `?paper=1` (see B-pkg-1 for where it lands). After **open** on CURRENT harness-home, classic Command Center returned with canvas, Michael + Pam (`17-classic-command-center.png`).
- Quit: Cmd+Q → **QUITTING NOW?** / **2 AGENTS STILL RUNNING** / keep them running · closing time · kill all & quit (`18-quit-modal.png`). **kill all & quit** exited pid 35460 in ~1s. No leftover `Vajras` / vajras-office claude processes. Installed Munder Difflin pid 55356 + live `hooks.sock` still up.

### P0

None this run.

### P1

### B-pkg-1 · Paper **Classic UI** toggle dumps the hive picker, not the office

**Flow:** Paper title-bar toggle (requested check).  
**Steps:** From Paper Home, click **Classic UI**.  
**Expected:** pixel Command Center for the already-open harness, same roster.  
**Actual:** full-screen **SELECT A HARNESS CONFIG** with CURRENT `harness-home` (`16-classic-after-toggle.png`). `location.replace` remounts classic from a cold renderer. Clicking **open** restores the office; sprites then show **reconnecting…**. Classic chrome has **no** Paper UI control to go back (`paperToggle: false`).

**Severity: P1** (the advertised toggle does not restore the running office).

### P2

### B-pkg-2 · Packaged chrome still says **Munder Difflin**

Window `<title>` in asar `out/renderer/index.html` is `Munder Difflin`. Paper title-bar brand in `PaperApp-C-KYBAjh.js` is the literal `"Munder Difflin"` (no `Vajra`). Onboarding headline **WELCOME TO MUNDER DIFFLIN**; body copy “Munder Difflin turns the CLI agent…”. Dock/Finder name is **Vajra's Office**. At `8b829b58` this is what shipped; later source retitles `index.html` / `en.json` persona.

**Severity: P2** (wrong product name on every first-run surface).

### B-pkg-3 · Onboarding Home still defaults to `~/HarnessAgents`

**Flow:** first-run Step 1 of 4.  
**Expected:** default is the pinned fork home `~/Library/Application Support/vajras-office/harness-home` (`FORK_HOME_DIR_NAME`).  
**Actual:** field + copy suggest `~/HarnessAgents` (`04-home.png`). Tester pasted the isolated path before Finish. Accepting the default would create a third hive outside both the live office and userData.

**Severity: P2** (MDF-36 pin is easy to walk around on the happy path).

### B-pkg-4 · Add Agent has no project if onboarding skipped repos

Skipping repos leaves the Identity/Workspace step without a registered folder. Spawn requires name + cwd + command; Tester had to type the harness-home path. After Finish, `registeredRepos` later included that path.

**Severity: P2**

### B-pkg-5 · Paper agent rail is a stub, not the packaged hive

Paper sidebar listed **Michael / Developer / Tester** (demo statuses idle/working/waiting) and Home copy “Live agent tiles land in MDF-12… Not wired yet”. Packaged hive at that moment was Michael + Pam. Expected until MDF-12; still wrong if someone treats Paper as the live office.

**Severity: P2** (known gap; filing so the smoke is complete).

### B-pkg-6 · Classic title bar has no Paper UI toggle

Paper → Classic is a titled button. Classic → Paper is only `?paper=1` or `localStorage paper.classicUi='0'`. No title-bar control on the pixel chrome.

**Severity: P2**

### Packaged smoke counts

- P0: 0
- P1: 1 (Classic UI toggle → hive picker)
- P2: 5
- Isolation: held (live log gained no fork `app-start`)

---

## MDF-41 re-verify

Tester (`tester-mv2fnyz5`) · 2026-10-10 · browser only · gallery `http://127.0.0.1:5179` (worktree `munder-difflin-ui` HEAD includes `e1273f52`). God named `3adf932d`; the a11y merge on `fork/main` is **`e1273f52`** (`2da54fbe` fix). Evidence `/tmp/mdf41-verify/`.

| Bug | Result |
| --- | --- |
| P1 B-67-1 Combobox keyboard / roles | **Verified.** Trigger `aria-haspopup=listbox`; list `role=listbox` + `role=option`; ArrowDown highlights; Enter selected Tester. |
| P1 B-810-1 Collapsed nav names | **Verified.** Width 64px, 8/8 workspace links have `aria-label`, 0 unnamed. |
| P1 B-810-5 Palette Tab trap | **Verified.** Overlay `tabIndex=-1`; 8 Tabs stayed on the palette input; Escape closes. |

No P1 reopened. Residual (not a reopen): every Combobox hardcodes `id="paper-cb-list"`, so two gallery Comboboxes share one listbox id — SR `aria-controls` can point at the wrong list. Not one of the three P1s.
