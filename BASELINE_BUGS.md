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

---

## Electron 44 clipboard (be5fba11)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-1d31fe.

Rebuilt with `npm run dist:fork:mac` in `/Users/vajra/APILayer/myDifflin/munder-difflin` (first pack failed: `node_modules/electron/dist` missing after npm install of 44.7.0; `node node_modules/electron/install.js` then pack succeeded). App UA **Electron/44.7.0** Chrome/152. Packaged hive `app-start` `electron: "44.7.0"`. Evidence `/tmp/mdf-e44-clip/`.

Isolation: live `hive/log.jsonl` **delta 0** vs pre-launch snapshot. Installed Munder Difflin pid 55356 still running after fork quit.

### Checks

| Surface | Result |
| --- | --- |
| `readClipboardSync` / `readClipboard` / `copyToClipboard` | **Pass.** pbcopy marker round-tripped on both sync and async; writeText then sync-read matched. |
| Terminal text paste | **Pass.** `.xterm` `contextmenu` (the `pasteClipboard` path) inserted `ZZZCLIP…` into Michael's prompt (`08-js-contextmenu.png`). |
| Terminal text copy | **Pass** at IPC (`copyToClipboard` is what `copySelection` calls). Selection-copy gesture not separately screenshotted. |
| Image paste (`clipboard:saveImage` / `readClipboardPng`) | **Pass.** macOS PNG clipboard → temp file, PNG signature `89504e47`, 78 bytes. Same helper the composer `onPaste` awaits. |
| Dictation paste race | **Pass** at the sync bridge. After `pbcopy NEW`, `readClipboardSync` returned NEW in 1 ms; restoring OLD then read OLD. `pasteClipboard()` uses this sync read inside the keydown/contextmenu handler. |

Quit: Cmd+Q → QUITTING NOW? / 2 agents → kill all & quit; process gone; no leftover Vajras.

### Counts

- P0: 0
- P1: 0
- P2: 0 (clipboard). Cold launch still opens the hive picker (already B-pkg-1). Window title is **Vajra's Office** on this HEAD (B-pkg-2 was on the 8b829b58 asar).

---

## MDF-16 Tasks (paper.html#/tasks)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-756804.

Browser only. Did **not** launch Electron. Gallery from the **main clone** (contains `29f2b866 merge MDF-16 tasks screen into fork/main`) at `http://127.0.0.1:5181/paper.html#/tasks`. Developer gallery on :5179 is the `munder-difflin-ui` worktree and does **not** contain 29f2b866 — left running. HEAD of the clone at QA time: `cd250db1` (ancestor of 29f2b866). Evidence `/tmp/mdf16-qa/` (screenshots 01–16 + `cdp.js`). Chrome CDP 9340.

Demo fixtures: 25 cards (10 todo / 2 doing / 2 blocked / **11 done**).

### What passed

- Board / List / Timeline view buttons, `role="group"` `aria-label="Task view"`, `aria-pressed` tracks the active view. Keys **1 / 2 / 3** switch views.
- **/** focuses `aria-label="Filter tickets"`. Search `MDF-19` → 1 card. Nonsense query → EmptyState **No cards match** + **Clear filters**. Status Blocked → MDF-19, MDF-21. Owner Kelly → MDF-16, MDF-15. Date **Updated today** → MDF-15.
- List: 25 rows, headers Key / Title / Status / Owner / Priority / Depends / Updated, every `tbody tr` `tabIndex=0`.
- Timeline: region `aria-label="Task timeline"`, 25 id buttons, 25 spans, 15 dependency lines, `prefers-reduced-motion` kills the doing pulse.
- Deep link `#/tasks/MDF-16` opens a Radix sheet titled MDF-16; **Escape** closes and hash returns to `#/tasks`. **j / k / Enter** selected MDF-13 and opened its sheet.
- MDF-19 ASK ME: question, Answer textarea, Dismiss. Status / Priority / Owner native selects on the sheet.
- Focus ring on Board (`--paper-focus-ring`). RTL mirrors the board and gantt. Dark and hc paint. 0 unnamed cards. Electron not launched.

### P0

None this run.

### P1

### B-16-1 · Default shell clips the **Done** column, and the board cannot scroll to it

**Flow:** Paper Tasks board at the advertised min window and at a typical 1280×900 shell (sidebar + inspector).  
**Steps:** Open `paper.html#/tasks` at 1280×900 (and 1024×640).  
**Expected:** To do / Doing / Blocked / Done all visible, or an obvious horizontal affordance. Same bar as classic B-5.  
**Actual:**
- Four columns exist in the DOM (`Done, 11 cards`). At 1280×900 the board is **621px** wide; four × `min-width: 240px` plus gaps is **998px**. **Done** `visible: false` (left 1062, right 1304). Blocked is also clipped (right 1052). Screenshots `01-board-light.png`, `11-board-dark.png`, `12-board-hc.png`, `15-narrow-1024.png`.
- At 1024×640: Done `visible: false`, `boardOverflow: true`.
- `.pt-board` declares `overflow-x: auto`, but `MAIN.paper-main` is `container: screen / inline-size` at **661px**. `@container screen (max-width: 720px)` then sets `.pt-board { overflow: visible }`. Computed `overflow-x` at 1280×900 is **`visible`**. No scrollbar. The 11 done cards are unreachable on the board.
- Toolbar lede is `2 doing · 2 blocked` and never mentions done, so the missing column has no count hint.

**Severity: P1** (layout; the Done column is the audit trail of the board).

### P2

### B-16-2 · Timeline last tick is clipped

**Flow:** Tasks → Timeline.  
**Expected:** Axis labels Oct 4 … Oct 11 fully readable.  
**Actual:** `.pt-gantt-axis { overflow: hidden }`. Tick at 100% uses `translateX(-50%)`, so **Oct 11** (left 923 / right 959) sits past the axis right edge (947) and paints as **“Oct”**. Screenshot `07-timeline.png`.

**Severity: P2**

### B-16-3 · Timeline span accessible name is key + status only

**Flow:** screen reader on the gantt bars.  
**Expected:** name includes the ticket title (the left-column button already shows key + title).  
**Actual:** `aria-label={\`${t.key} ${STATUS_LABEL[t.status]}\`}` — e.g. `MDF-16 To do`. 25/25 spans. No `title` attribute.

**Severity: P2** (a11y)

### B-16-4 · `groupTimeline` owner labels never render

**Flow:** Tasks → Timeline.  
**Expected:** rows grouped by owner (the helper returns `{ id, label, tasks }`).  
**Actual:** `groupTimeline(…).flatMap((g) => g.tasks)` throws the group labels away. The gantt is a flat created-at list. Unassigned / Kelly / Developer headings never appear.

**Severity: P2**

### B-16-5 · Board status change is pointer-only

**Flow:** move a card between columns without a mouse.  
**Expected:** a keyboard path on the board (or an announced alternative).  
**Actual:** columns accept HTML5 drop only (`onDrop` → `patchTask`). Cards are `draggable` buttons. Keyboard users can still change status via the sheet `<select aria-label="Status">` after Enter — that path works, but the board itself has no keyboard drop / column target.

**Severity: P2**

### B-16-6 · Blocked card titles and chips clip with no tooltip

**Flow:** Board, Blocked column (and Doing chips) at default width.  
**Expected:** full title readable, or `title` on hover.  
**Actual:** MDF-19 title cuts at “who-has-what, ro”; MDF-11 dependency chips clip MDF-10. `.pt-card-title` / chip row have no `title`. Screenshots `01-board-light.png`, `05-blocked.png`.

**Severity: P2** (visual)

### MDF-16 counts

- P0: 0
- P1: 1 (Done column clipped / unscrolled)
- P2: 5
- Electron: not launched

---

## MDF-14 Orchestrator (paper.html#/orchestrator)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-f0fe09.

Browser only. Did **not** launch Electron. Gallery from the **main clone** (HEAD `232c9aaa`, merge `99b551c1 feat(ui): Orchestrator screen`) at `http://127.0.0.1:5182/paper.html#/orchestrator`. Developer gallery on :5179 left running. Evidence `/tmp/mdf14-qa/`. Chrome CDP 9340.

PLAN §4.3.3: same as an agent room, plus a routing log, the board, breaker controls and a fleet budget chart.

### What passed

- `#/orchestrator` and `#/agent/god` both mount `data-orch=true` with six tabs: Overview, Messages, Tasks, Routing, Board, Control. Tablist `aria-label="Orchestrator panels"`. ⌘K **Open Orchestrator** lands on `#/orchestrator`. Sidebar Michael is `aria-current="page"`.
- Agent-room chrome: h1 Michael, role Orchestrator, demo terminal `aria-label="Michael terminal"`, composer `aria-label="Message Michael"`, Enter-send as hive mail (`Sent to Michael's inbox.`). Messages count 12 → 13 after send.
- Routing: 12 god-mail rows, `data-dir` in/out, act badges, subjects. Board: 2×2 To do / Doing / Blocked / Done, **Open Tasks** → `#/tasks`, card `#/tasks/MDF-12` opens the sheet. All four columns visible (unlike Tasks B-16-1).
- Control: breaker `role="group"` `aria-label="Circuit breaker"` with `aria-pressed`; **Stop** is danger + `data-tone="danger"` + `role="status"` note; localStorage `paper.orch.breaker`. Fleet meters `role="meter"` named per agent. Restart copy and Configuration (Engine / Model / Mode) present when the pane is tall enough.
- ArrowRight moves Overview → Messages → Tasks → **Routing** (extra tabs are in the same Radix list). RTL mirrors the two-pane room. Dark / hc paint. `prefers-reduced-motion` kills meter transition. Electron not launched.

### P0

None this run.

### P1

### B-14-1 · Default shell (and 1024×640) stacks the room; the terminal becomes a strip

**Flow:** Paper Orchestrator at 1280×900 with the inspector open (shell default) and at min 1024×640.  
**Expected:** PLAN — terminal on the left, panels on the right. Min window 1024×640 still usable.  
**Actual:**
- `.pa-root` is `container: room / inline-size`. With sidebar + inspector the room is **661px**. `@container room (max-width: 760px)` forces one column: terminal on top (**325×661**), panels below.
- At **1024×640** the room is **405px**. Terminal shows about one output line plus the composer; board cells are **183×71** and clip every title. Screenshots `01-overview.png`, `17-narrow-1024.png`.
- Control’s **Restart orchestrator** sits below the fold in the stacked pane (CDP click at y=982 missed the 900px viewport; note stayed `Breaker → Stop`). Screenshot `07-control.png` cuts at Engine.
- Hide inspector: room **994px**, grid `574px 420px`, two-pane as designed (`19-no-inspector.png`). The advertised layout is opt-in, not the default.

**Severity: P1** (layout; the orchestrator’s primary surface is the terminal).

### P2

### B-14-2 · Mini-board silently drops cards after eight

**Flow:** Orchestrator → Board.  
**Expected:** column count matches the list, or an explicit “N more”.  
**Actual:** heads say **TO DO 10** and **DONE 11**; `by[col].slice(0, 8)` renders 8. MDF-23 / MDF-25 (todo) and MDF-10 / MDF-36 / MDF-35 (done) never appear. No overflow hint. Screenshot `06-board.png`.

**Severity: P2**

### B-14-3 · Header says **working**; the line says idle

**Flow:** `#/orchestrator` demo.  
**Expected:** status badge, sidebar line and Overview lede agree.  
**Actual:** `DEMO_AGENTS` god is `status: 'working'`. `DEFAULT_AGENTS` god is `status: 'idle'`, line **Waiting on the next brief**. Header badge **working**; sidebar + Overview use the idle line. Two demo tables, two truths.

**Severity: P2**

### B-14-4 · Fleet spend chart is a different roster than the floor

**Flow:** Orchestrator → Control.  
**Expected:** spend rows are the live/demo floor, including Kelly.  
**Actual:** `DEFAULT_AGENTS.filter(a => a.costToday)` — five names, **$2.65**. Lede **4 live · 7 on the floor** (fixtures include Kelly + archived Researcher). Kelly has floor mail and a Doing card, **$0** on the chart. Meter `aria-valuemax` is the peer max (`1.4`), not a budget.

**Severity: P2**

### B-14-5 · Selected tab swallows the focus ring

**Flow:** Tab to Overview, ArrowRight across the six tabs.  
**Expected:** visible `--paper-focus-ring` (QA bar).  
**Actual:** Radix activates on arrow, so the focused tab is always `[data-state=active]`. `.paper-tabs-trigger[data-state="active"] { box-shadow: var(--paper-elev-1) }` wins over `.pc-screen :where(button):focus-visible`. Computed shadow on Overview was the 1px elevation, not the ring. Screenshot `11-focus.png`.

**Severity: P2** (a11y)

### B-14-6 · RTL composer placeholder leads with a period

**Flow:** `dir=rtl` on `#/orchestrator`.  
**Expected:** “Message Michael. Paste or drop…” stays readable.  
**Actual:** placeholder paints **“.Message Michael. Paste or drop images to attach”**. Status line **“.Sent to Michael's inbox.”** Screenshots `15-board-rtl.png`, `16-control-rtl.png`.

**Severity: P2** (RTL)

### MDF-14 counts

- P0: 0
- P1: 1 (stacked room / terminal strip)
- P2: 5
- Electron: not launched

---

## MDF-49 re-verify (B-16-1)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · browser only · god inform conv-72fd1b.

`75c6c13d` / merge `0580c3f5` on fork/main (HEAD `725bde30`). Gallery `http://127.0.0.1:5183/paper.html#/tasks` from the **main clone**. Developer :5179 left running. Evidence `/tmp/mdf49-qa/`. Electron not launched.

| Bug | Result |
| --- | --- |
| P1 B-16-1 Done column unscrolled | **Verified.** At 1280×900 `overflow-x` is **`auto`** (`scrollbar-gutter: stable`), board 621 / scrollWidth 998. After `scrollLeft=377` **Done** is fully in view with all **11** cards (MDF-1…MDF-35). At 1024×640 same: `canScroll` true, after `scrollLeft=633` Done in view, 11 cards. Lede now `2 doing · 2 blocked · 11 done`. Screenshots `01-board-1280.png`, `02-board-scrolled.png`, `03-board-1024.png`, `04-board-1024-scrolled.png`. |
| P2 B-16-2 Timeline last tick | **Verified.** Last mark with x>92 is omitted; remaining ticks Oct 4–10, none clipped. `05-timeline.png`. |
| P2 B-16-3 Span accessible name | **Verified.** `aria-label` is `MDF-2 Product plan: Pro parity and UI direction Done` (key + title + status) plus `title`. |
| P2 B-16-4 Owner group headings | **Verified.** Timeline rows grouped **DWIGHT / DEVELOPER / TESTER / PHYLLIS / KELLY / UNASSIGNED**. |
| P2 B-16-6 Card title tooltips | **Verified.** `.pt-card-title` has `title={task.title}`. |

Left open (not in MDF-49): **B-16-5** board status change is pointer-only.

No P1 reopened on the Tasks board.

---

## MDF-18 Memory (paper.html#/memory)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-2881a2.

Browser only. Did **not** launch Electron. Gallery from the **main clone** at `http://127.0.0.1:5183/paper.html#/memory` (`c114c078` merge; HEAD of the clone at QA time `641a49d9`, ancestor of the Memory merge). Developer gallery :5179 left running. Evidence `/tmp/mdf18-qa/`. Chrome CDP 9340. First load of the already-open tab was a stale “Not wired yet” slot; `Page.reload({ignoreCache:true})` mounted `.pm-root`.

Demo: `memorySource()` (no `window.cth`), `recent()` **8** of 10 notes, palace **minilm**. Headless Chrome used the **SVG** graph fallback (no WebGL context); that is the designed fallback, not a product miss.

### What passed

- Cards / List / Graph / Knowledge `role="tablist"` `aria-label="Memory view"`, `aria-selected` tracks the tab. Keys **1 / 2 / 3** switch Cards / List / Graph.
- **/** focuses `aria-label="Search memory by meaning"`. Nonsense `zzzz-no-such-memory` → EmptyState **No results** + five suggestion chips. Chip **release checklist** → **4** hits (3 memory + SPEC.md knowledge). Source **Knowledge** → 1 card. Agent **Phyllis** → 1 card.
- Cards: 8, `role="button"` `tabIndex=0`, first `aria-current="true"`. **j / k / Enter** opened the Developer Electron-upgrade sheet. **Open file** toast **Gallery cannot open files**. **r** toast **Reflected 0 of 4 notes**. Close (X) dismisses the sheet.
- Graph: `role="img"` with a 9-node / 12-link label, legend `aria-hidden`, SR list of 9 buttons (**Agent Michael** … **Topic Release checklist**) exposed in the AX tree. Agent chips + topic chip filter. SVG fallback painted clusters and labels.
- Knowledge: SPEC.md + MEMORY_GRAPH_SPEC.md; **Add files** injects onboarding-notes.md; **Remove** drops a row and toasts.
- Dark / hc paint. Search icon uses `inset-inline-start`. Focus ring on sheet **Open file** matches `--paper-focus-ring`. 1024×640: tabs, search, chips and footer stay in view; cards scroll. 0 unnamed chrome buttons. Electron not launched.

### P0

None this run.

### P1

### B-18-1 · Graph topic **memory.md** filters to an empty board

**Flow:** Memory → Graph → pick a topic (SR button or node).  
**Steps:**
1. Open `#/memory`, press **3**.
2. Activate **Topic memory.md** (first topic in the SR list; `graphFromHits` prefixes every hit with `## ${h.file}` so `extractTopics` treats the filename as a topic).
3. `hitMentions` then keeps hits whose **body** contains `memory.md`.

**Expected:** the topic matches the notes that produced it, or the filename is not a topic.  
**Actual:** lede **0 results**, empty copy **No memories yet** / “Search by meaning, or wait for agents to write notes.” Chip **Topic: memory.md ×**. Screenshot `25-topic-filter.png`. Real topics that appear in the body (**Electron upgrade**, **Release checklist**) would match; the graph still leads with a dead filename topic.

**Severity: P1** (Graph is a headline view of this card; the first topic action empties the board).

### P2

### B-18-2 · List rows are not in the tab order

**Flow:** Memory → List.  
**Expected:** like Tasks, every `tbody tr` is keyboard-activatable (`tabIndex=0`) or the row is not a click target.  
**Actual:** 8 rows, `onClick` opens the sheet, `tabIndex` **-1**, no `role`. Window **j / k / Enter** still move/open. Screenshot `02-list.png`.

**Severity: P2** (a11y)

### B-18-3 · Knowledge **Remove** is the same name on every row

**Flow:** Memory → Knowledge.  
**Expected:** each danger control names the document (WCAG 2.4.6 / 2.5.3).  
**Actual:** two (then three) buttons whose accessible name is **Remove**; `aria-label` and `title` null; last `<TH>` is empty. Screenshot `04-knowledge.png`.

**Severity: P2** (a11y)

### B-18-4 · Knowledge has no digit shortcut

**Flow:** keyboard. Footer documents **1 2 3** views.  
**Expected:** a key for the fourth tab, or Knowledge is not a peer tab.  
**Actual:** **4** leaves Knowledge selected. Mouse (or tab) is required. Digit-4 probe logged `AFTER_DIGIT4` still on Knowledge.

**Severity: P2**

### B-18-5 · Graph node labels use physical `left` / `top`

**Flow:** `dir=rtl` on `#/memory` Graph.  
**Expected:** `memory.css` comment — logical properties for RTL.  
**Actual:** `.pm-node-label` is `style={{ left: p.x + 10, top: p.y - 7 }}`. Legend uses `inset-inline-start` and flips; labels stay LTR. Search field padding is logical (`padding-inline-start: 28px`). Screenshot `18-rtl-graph.png`.

**Severity: P2** (RTL)

### B-18-6 · Chip / legend / node type is **11px**

**Flow:** Memory chrome vs DESIGN.md six-step scale (xs = 12). MDF-46 skipped `screens/memory`.  
**Actual:** `.pm-chip-label`, `.pm-card-meta`, `.pm-graph-legend`, `.pm-node-label` are `font-size: 11px`. Computed chip **11px**, `--paper-text-xs` **12px**. Footer is 12px.

**Severity: P2**

### B-18-7 · Topic filter uses the empty-roster copy

**Flow:** after B-18-1. `searching` is `query.trim().length > 0`.  
**Expected:** a filtered-empty state (**No results** / clear topic).  
**Actual:** title **No memories yet** because the query string is still empty. Screenshot `25-topic-filter.png`.

**Severity: P2**

### B-18-8 · RTL sheet body leads with a period

**Flow:** `dir=rtl`, open a memory sheet.  
**Expected:** “Rebuilt native modules after the Electron upgrade…” stays readable.  
**Actual:** RichText bullet paints **“.node-pty needed @electron/rebuild 4”**. Screenshot `18-rtl-graph.png` (sheet still open). Same class of bug as B-14-6.

**Severity: P2** (RTL)

### B-18-9 · Demo **recent()** hides two of ten notes

**Flow:** `#/memory` with empty search.  
**Expected:** Cards / List / Graph agree on the demo floor, or the lede says it is a slice.  
**Actual:** `DEMO_MEMORY` has 10 sections; `recent()` is `rankHits(memHits()).slice(0, 8)`. Lede **8 results**. Live `recent()` slices 18.

**Severity: P2**

### B-18-10 · Sheet title is the filename, not the note

**Flow:** **Enter** on a card.  
**Expected:** the heading the person just read (e.g. “Electron upgrade”).  
**Actual:** Radix title **memory.md** for every memory hit. Screenshot `12-sheet.png`.

**Severity: P2**

### MDF-18 counts

- P0: 0
- P1: 1 (filename topic empties Graph)
- P2: 8
- Electron: not launched

---

## MDF-46 design QA 1 (spot-check)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-05ca89.

Browser only. Gallery from the **main clone** `http://127.0.0.1:5183/paper.html` (merge `dbd53791` / `dd597dda`; HEAD `641a49d9`). 1440×900 and 1024×640, light and dark. Evidence `/tmp/mdf46-qa/`. Electron not launched. Developer :5179 left running.

Toby’s P1 1–8 and P2 9–18 in `specs/design-qa-1.md`. P3 skipped.

### P1 re-check

| # | Claim | Result |
| --- | --- | --- |
| 1 | Theme default system; menu System/Light/Dark/HC | **Verified.** `aria-label="Theme (system)"`, menu **System / Light / Dark / High contrast**. Choosing Dark sets `data-paper-theme=dark`. Screenshots `02-theme-menu.png`, `03-home-1440-dark.png`. |
| 2 | Inbox hides Inspector; title can use the pane | **Verified.** Inbox default **Show inspector**, dock width 0. Detail ~614px at 1440. Title “Can I test on your device after MDF-11?” on one line. `04-inbox-1440-light.png`. |
| 3 | ≤1100 Inspector is a Sheet; Inbox <840 is list→detail push | **Mostly verified.** At 1024×640 Inspector stays closed. Inbox is list-first (detail width 0, icon rail). Did not click through the push. `08-inbox-1024-light.png`. |
| 4 | Window j/k/e/r/Enter; focus `.pi-rows` | **Verified.** Two **j**s moved Needs-you from Tester’s MDF-11 thread to Michael’s token-budget thread; detail followed. `05-inbox-jk.png`. |
| 5 | Danger only for needs-you; Question neutral | **Verified.** **Needs reply** danger chip; **Question** neutral; unread is a single accent dot; sidebar **asked** pill danger. |
| 6 | Raw px type → `--paper-text-*` | **Verified** on shell/inbox (no 11px in the shell dump). Memory still has 11px (B-18-6; MDF-46 skipped that screen). |
| 7 | `--paper-focus-ring` on the list | **Verified.** `.pi-rows:focus` `box-shadow` matches `--paper-focus-ring`. `06-inbox-focus.png`. |
| 8 | Notes collapsible; agents min 4 rows | **Verified at 1440×900.** All five agents including Dwight are in the rail (`12-sidebar-1440.png`). At **1024×640** Dwight’s row sits below the sidebar (`y=695`, sidebar height 595) and clips. |

### P2 spot-check (claimed fixed)

Title bar has **$2.65 today**, Voice, Account; Classic UI is out of the bar (account menu). Inbox folder rail is labelled at 1440. Thread cards start with the body. ⌘K palette has icons, **G I** shortcuts, footer “↑↓ to move · ↵ to run · esc to close”. Notes is a collapsible block with a chevron.

### P2 leftover

### B-46-1 · Dwight still clips at 1024×640

**Flow:** min window 1024×640, Home or Inbox.  
**Expected:** P1 #8 — agents keep a minimum of four readable rows; the fifth can scroll.  
**Actual:** Michael and Phyllis are visible; Developer / Tester / Dwight sit below `.paper-sidebar` (`clip: true`). Screenshot `08-inbox-1024-light.png`, `10-home-1024-light.png`. At 1440×900 Dwight’s status ring kisses the Notes splitter (`12-sidebar-1440.png`).

**Severity: P2** (the 900px crush is gone; the min window still hides the tail of the roster).

### MDF-46 counts

- P0: 0
- P1: 0 reopened
- P2: 1 leftover (Dwight at 1024×640)
- Electron: not launched

---

## MDF-17 Automations (paper.html#/automations)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-10d3c2.

Browser only. Did **not** launch Electron. Gallery from the **main clone** at `http://127.0.0.1:5183/paper.html#/automations` (merge `c7be65e7`; HEAD of the clone at QA time `641a49d9`, later `7a0b99d5`). Developer gallery :5179 left running. Evidence `/tmp/mdf17-qa/`. Chrome CDP 9340. Hard reload (`Network.setCacheDisabled` + `Page.reload({ignoreCache:true})`) before the dump.

Demo: `automationsSource()` (no `window.cth`). Badge **Demo data**. Six rows on All: Ops standup, Morning digest, Weekly npm audit, GitHub PRs webhook, Auto-compact / Auto-clear context.

### What passed

- Tabs All / Schedules / Webhooks / History. **h** opens History. **n** opens New schedule (target Michael/god, Type it “every weekday 9am”, Next 3 runs, Quiet hours, Guardrails). **⇧N** is labelled on New webhook. **j / k** move selection (after two **j**s Weekly npm audit is selected). **Enter** opens the Schedule sheet. Switches have names **Turn {row} on or off**.
- Sheet fields: Name, Target agent, Message, Type it, Days, Time, Next 3 runs, Quiet hours, Guardrails. Close (X) dismisses. Screenshot `03-sheet.png`, `07-new-schedule.png`.
- History ledger has 4 rows: ran / waiting on you / skipped:quiet / missing required field. Screenshot `04-history.png`.
- RTL (`dir=rtl`) reverses Name/Type/Next/Last/On. Screenshot `09-rtl.png`.
- 1024×640: six rows and the footer keys stay in view. Screenshot `10-1024.png`. Dark paints. 0 unnamed chrome buttons. Electron not launched.

### P0

None this run.

### P1

### B-17-1 · History ledger packs to the right and clips Status

**Flow:** `#/automations` → History (**h**).  
**Expected:** When / Source / What / Status share the pane; **waiting on you** shows Approve · Deny; What ellipsizes on purpose (`.pa-what { max-width: 36ch }`).  
**Actual:** the table sits in the right half of `.pa-body`. What is clipped mid-word (“Post the hourly flo”, “Deploy the hotf”). Status (and the pending-row Approve/Deny) is off-canvas. `.pa-history-bar { justify-content: flex-end }` parks **Clear history** against the When header instead of as a page action. Screenshot `04-history.png`.

**Severity: P1** (layout — pending-webhook approve is the History job).

### P2

### B-17-2 · History tab accessible name is **HistoryH**

**Flow:** All dump.  
**Expected:** tab name **History**; **H** is a separate kbd hint.  
**Actual:** `<TabsTrigger>…{t.filters[f]}{f === 'history' && <Kbd>H</Kbd>}</TabsTrigger>` concatenates. Dump `tabs[3].t` is **HistoryH**. Screenshot `01-all.png`.

**Severity: P2** (a11y)

### B-17-3 · New schedule primary control looks like a switch

**Flow:** header actions.  
**Expected:** **New schedule** reads as a button; **N** is a kbd chip.  
**Actual:** `<Kbd>N</Kbd>` on `variant="primary"` paints a white pill on the filled blue control — same silhouette as the On column switches. Screenshots `01-all.png`, `10-1024.png`.

**Severity: P2** (visual)

### B-17-4 · Roster rows are not in the tab order

**Flow:** keyboard. Footer documents **J K** move.  
**Expected:** a roving `tabIndex={0}` on the selected row, or the name button is enough and rows are not `aria-selected`.  
**Actual:** every `TR` is `tabIndex={-1}` with `aria-selected`. Name is a `<button class="pa-link">`. Context rows have no name button. Dump `rowSample[].tab` is **-1**.

**Severity: P2** (a11y)

### B-17-5 · Context rows look editable and do nothing on click / Enter

**Flow:** All tab, Auto-compact / Auto-clear (`class="pa-tr is-context"`).  
**Expected:** either an editor, or the row does not share the clickable `pa-tr` cursor.  
**Actual:** `openRow` only handles `schedule` and `webhook`. Click / Enter on a context row is a no-op (the switch still toggles).

**Severity: P2**

### MDF-17 counts

- P0: 0
- P1: 1 (History layout)
- P2: 4
- Electron: not launched

---

## MDF-19 Capabilities (paper.html#/capabilities)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-8ef02f.

Browser only. Did **not** launch Electron. Gallery from the **main clone** at `http://127.0.0.1:5183/paper.html#/capabilities` (merge `641a49d9`). Developer gallery :5179 left running. Evidence `/tmp/mdf19-qa/`. Chrome CDP 9340. Hard reload before the dump.

Demo: `marketplaceItems()` / `matrixAgents()`. Lede **68 items · 56 installed**. Badge **Demo data**.

### What passed

- Tabs Marketplace / Installed / Who has what. Keys **1 / 2 / 3** switch them. **/** focuses `aria-label="Search capabilities"` (the first dump accidentally sampled Notes **Search notes**; after **/** the capabilities field is focused). **n** opens dialog title **Save current selection as bundle**. Screenshot `04-bundle.png`.
- Marketplace: 68 cards (Word documents, PDF files, PowerPoint, …). Installed table: Name / Type / Source / Used by / Actions. Matrix: Agent column + per-cap **All**, checkboxes labelled `{agent} · {cap}` (Michael · Word documents). Cmd+Enter apply is documented in the footer.
- Dark marketplace paints. RTL screenshot `07-rtl.png`. 1024×640 marketplace screenshot `09-1024-market.png`. 0 unnamed chrome buttons. Electron not launched.

### P0

None this run.

### P1

### B-19-1 · Who-has-what invents 24 demo seats

**Flow:** `#/capabilities` → Who has what (**3**).  
**Expected:** the matrix is the live roster (six agents on this floor: Michael, Dwight, Developer, Tester, Phyllis, Kelly).  
**Actual:** `MATRIX_AGENT_TARGET = 30` in `model.ts`. `matrixAgents()` pads with `{ id: 'demo-agent-${n}', name: 'Agent ${n}', role: 'Demo seat' }` from **Agent 07** through **Agent 30**. Screenshot `03-matrix.png` shows Agent 07–10 under Kelly. 30 rows × ~60 columns ≈ **1800** checkboxes. Real grants drown in empty seats. Same at 1024 (`08-1024-matrix.png`).

**Severity: P1** (the matrix cannot be read as who-has-what).

### P2

### B-19-2 · Installed Reveal / Uninstall share one name on every row

**Flow:** Installed tab.  
**Expected:** each action includes the skill (**Uninstall Word documents**).  
**Actual:** every row is a `<Button>` with visible text **Reveal** / **Uninstall** and no per-row `aria-label`. 56 identical names. Screenshot `02-installed.png`.

**Severity: P2** (a11y)

### B-19-3 · Matrix columns overflow at 1280 and 1024

**Flow:** Who has what, 1280×900 and 1024×640.  
**Expected:** an obvious horizontal affordance, or a frozen Agent column plus a count of hidden caps.  
**Actual:** headers clip (**Word docume…**, **Brand guidelin…**). At 1024 only ~12 of ~60 caps are in view (Word documents … Doc coauthoring). No column-count in the lede. Screenshots `03-matrix.png`, `08-1024-matrix.png`.

**Severity: P2** (layout)

### B-19-4 · Bundle control wraps under the fill buttons at 1024

**Flow:** Who has what at 1024×640.  
**Expected:** **Save current selection as bundle** stays in the toolbar with Fill row / Fill all agents.  
**Actual:** the bundle button drops onto its own row, full-width under the agent select. Screenshot `08-1024-matrix.png`.

**Severity: P2** (visual)

### MDF-19 counts

- P0: 0
- P1: 1 (demo Agent 07+ pad)
- P2: 3
- Electron: not launched

---

## MDF-20 Temps + Connections (paper.html#/temps, #/settings/connections)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-4f54b3.

Browser only. Did **not** launch Electron. Gallery from the **main clone** at `http://127.0.0.1:5183/paper.html` (merge `7a0b99d5`; HEAD of the clone at QA time `3b48e7dc`). Developer gallery :5179 left running. Evidence `/tmp/mdf20-qa/`. Chrome CDP 9340. Hard reload before each route.

Demo: `tempsSource()` / `connectionsSource()` (no `window.cth`). Temps **1 / 4 live** (Darryl), 1 pending (Stapler), 3 history. Connections 3 rows (GitHub, Linear, httpbin). Badge **Demo data**. Gallery Test uses the in-memory mock (`HTTP 200 in 42 ms` on Linear) — that is the designed fallback, not a live probe.

### What passed

- **Temps.** Live card Stop + Open terminal. Pending copy names Settings › Autonomy & Budgets. History table Objective / Started / Runtime / Tokens / $ / Result / Slack. **j / k** move live → history. **Enter** opens Andy sheet (failed, failure reason **idle 20 min — never signaled done**). **x** opens **Stop this temp?** with Cancel / Stop temp. Result filter **failed** works. Dark / RTL paint. 0 unnamed chrome buttons. Screenshots `01-temps.png` … `08-temps-1024.png`.
- **Connections.** `#/settings/connections`. Secrets render as **••••**, never echoed. **n** opens Add connection (Template, Label, Base URL, Auth type, Secret `type=password`, Enabled for agents). **t** tests the selected row. **j / k** move. Remove is present. 1024×640 table stays in view. Screenshots `09-conn.png` … `15-conn-1024.png`. Electron not launched.

### P0

None this run.

### P1

### B-20-1 · Temps History collides with the footer at 1024×640

**Flow:** `#/temps` at min window 1024×640.  
**Expected:** Live, Pending, History, and the key footer all readable; History columns stay labelled.  
**Actual:** History header paints through the footer (**Objective** ghosted, Slack clipped to **Sla**). Body rows are gone. Screenshot `08-temps-1024.png`. At 1280 the table is fine (`01-temps.png`).

**Severity: P1** (layout — the history ledger is the Temps job at the min window).

### P2

### B-20-2 · Autonomy link goes to Home

**Flow:** Pending requests hint.  
**Expected:** **Settings › Autonomy & Budgets** opens that settings pane.  
**Actual:** `<a href="#/">{COPY.autonomyLink}</a>`. Hash `#/` is Home. The same phrase is already in the sentence, so the control looks like a duplicate.

**Severity: P2**

### B-20-3 · Temps card meta and Connections URLs are **11px**

**Flow:** type scale vs DESIGN.md (`--paper-text-xs` = 12).  
**Actual:** `.pw-card-meta { font-size: 11px }`, `.pn-url { font-size: 11px }`, `.pn-test` / `.pn-help` 11px. Computed `--paper-text-xs` is **12px**.

**Severity: P2**

### B-20-4 · History sheet title is the worker name; **failed** is painted twice

**Flow:** **Enter** on Andy’s row.  
**Expected:** the objective as the heading; result once.  
**Actual:** Radix title **Andy**, description **failed**, then a **failed** badge. Screenshot `03-sheet.png`.

**Severity: P2**

### B-20-5 · Add connection always says a secret is already saved

**Flow:** **n** on an empty GitHub template.  
**Expected:** the replace-secret hint only when `hasSecret`.  
**Actual:** `{COPY.secretSaved}` (**A secret is saved. Type a new one only to replace it.**) is unconditional under the password field. Screenshot `12-conn-add.png`.

**Severity: P2**

### B-20-6 · Test / Remove share one name on every row

**Flow:** Connections table.  
**Expected:** **Test Linear**, **Remove GitHub**.  
**Actual:** every row is a `<Button>` with visible text **Test** / **Remove** and no per-row `aria-label`. Screenshot `09-conn.png`.

**Severity: P2** (a11y)

### MDF-20 counts

- P0: 0
- P1: 1 (Temps History at 1024)
- P2: 5
- Electron: not launched

---

## MDF-50 Orchestrator two-pane re-check

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-6a7ace.

`e2714211` / merge `64e6c7b4` on fork/main. Gallery `http://127.0.0.1:5183/paper.html#/orchestrator` from the **main clone**. Developer :5179 left running. Evidence `/tmp/mdf50-qa/`. Electron not launched.

Re-check of **B-14-1** (MDF-14): `@container room (max-width: 760px)` stacked the Orchestrator so the terminal became a strip at default 1280 with inspector (room 661px) and at 1024×640.

### Result

| Viewport | Room | grid-template-columns | Terminal | Two-pane? |
| --- | --- | --- | --- | --- |
| 1280×900 + inspector | 661×855 | `369px 268px` / one row 742 | 369×742 | **Yes** |
| 1024×640 + inspector | 405×595 | `201px 180px` / one row 482 | 201×482 | **Yes** |
| 1024×640 inspector off | 738×595 | `405px 293px` / one row 474 | 405×474 | **Yes** |

`data-orch="true"` keeps `.pa-body` two-pane under the 760px room query. Stacking for Orchestrator is `@container room (max-width: 360px)` only. `#/agent/god` is the same orch room. Screenshots `01-orch-1280.png`, `02-orch-1024.png`, `03-orch-1024-noins.png`.

At 1024×640 the Inspector is a **Sheet** (MDF-46 P1 #3, ≤1100). That overlay is separate from the room grid; the terminal stays a column, not a strip.

**B-14-1 verified.** No P1 reopened. No new P0/P1/P2 this pass.

---

## MDF-22 archive + detach (paper.html#/agents/archived)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-565a8f.

Browser only. Did **not** launch Electron. Gallery from the **main clone** at `http://127.0.0.1:5183/paper.html#/agents/archived` (merge `3b48e7dc`). Developer gallery :5179 left running. Evidence `/tmp/mdf22-qa/`. Chrome CDP 9340.

Demo: three archived rows (Pam, Andy with **Worktree is missing**, Researcher). Sidebar footer **3 archived**.

### What passed

- Archived table Name / Archived / Last task / Disk / Actions. Andy gets **Reopen with a fresh worktree**. **j / k**, **Enter**, **/** documented. 0 unnamed chrome buttons.
- Live agent overflow (**Developer actions**) menu is **Stop** and **Archive** as separate items. Archive opens **Archive Developer?** (stops, hides, keeps memory/inbox/worktree, reopen from Archived agents). Cancel dismisses. Screenshot `02-stop-archive-menu.png`, `03-archive-dialog.png`.
- Home **Detach office** (`aria-label`) leaves **Shown in another window — Bring back**. Screenshot `05-home-detach.png`. Dark archived paints. Electron not launched.

### P0

None this run.

### P1

None this run.

### P2

### B-22-1 · Delete permanently wraps and clips at 1024×640

**Flow:** `#/agents/archived` at min window.  
**Expected:** Reopen and Delete stay on one line per row.  
**Actual:** **Delete permanently** wraps; Researcher’s control clips to **Delete**. Screenshot `06-archived-1024.png`.

**Severity: P2** (layout)

### B-22-2 · Delete permanently shares one name on every row

**Flow:** Archived table.  
**Expected:** **Delete Pam permanently**.  
**Actual:** every row is a `<Button>` with visible text **Delete permanently** and no per-row `aria-label`. Reopen on Andy is already distinct.

**Severity: P2** (a11y)

### MDF-22 counts

- P0: 0
- P1: 0
- P2: 2
- Electron: not launched

---

## MDF-51 Memory topic filter re-check

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-f9702f.

`f6551f34` / merge `da1d8dd1` on fork/main. Gallery `http://127.0.0.1:5183/paper.html#/memory` from the **main clone**. Developer :5179 left running. Evidence `/tmp/mdf51-qa/`. Electron not launched.

Re-check of **B-18-1**: Graph topics were filenames (`## memory.md`) so the first topic emptied the board.

### Result

Graph SR list is **Topic Release checklist**, **Topic Broker token**, **Topic Electron upgrade**, **Topic paper screens**, **Topic Paper shell**. `hasMemoryMd` is **false**. Lede **10 results**. Screenshot `01-graph.png`. `graphFromHits` concatenates hit bodies as-is (comment cites B-18-1).

**B-18-1 verified.**

Bonus: footer now documents **1 2 3 4** views; digit **4** selects Knowledge (`AFTER_DIGIT4` Knowledge `aria-selected=true`). **B-18-4** (no digit-4) is also fixed.

Left open from MDF-18 (not in this ticket): B-18-2, B-18-3, B-18-5, B-18-6, B-18-7, B-18-8, B-18-10. B-18-9 (recent() hid 2 of 10) looks fixed (lede **10 results**).

No P1 reopened. No new P0/P1/P2 this pass.

---

## MDF-21 Settings + onboarding (paper.html#/settings, #/onboarding)

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-06556c.

Browser only. Did **not** launch Electron. Gallery from the **main clone** at `http://127.0.0.1:5183/paper.html` (merge `01741907` / feat `6094945e`; MDF-48 folded). Developer gallery :5179 left running. Evidence `/tmp/mdf21-qa/`. Chrome CDP 9340. Hard reload before each route. **`#/settings/connections` left to MDF-20.**

### What passed

- **Settings.** Sections Appearance / General / Prerequisites / Agents & Models / Autonomy & Budgets / Connections / Voice / Memory & Knowledge. **/** focuses `aria-label="Search settings"`. Search **theme** returns the Theme field. Autonomy hash `#/settings/autonomy`. Settings › Connections uses `#/settings/connect` (does not steal MDF-20). REST integrations link is `#/settings/connections`. Dark / 1024 paint. 0 unnamed chrome buttons. Screenshot `01-settings.png` … `06-settings-1024.png`.
- **Onboarding.** Three steps Engines → Workspace → Meet. Claude Code recommended + installed. Workspace Home folder **`~/Library/Application Support/vajras-office/harness-home`** with **Use fork home** (MDF-48). Meet office name defaults to **Vajra's Office**. **Start the orchestrator** on step 3. Screenshot `07-onboard-engines.png` … `11-onboard-dark.png`. Electron not launched.

### P0

None this run.

### P1

None this run.

### P2

### B-21-1 · REST integrations link says Temps

**Flow:** Settings › Connections (`#/settings/connect`).  
**Expected:** **Open REST integrations** (code `defaultValue`) or **Open Connections**.  
**Actual:** `en.json` `settings.connections.openTemps` is **Open Temps & Connections**. The `href` is correctly `#/settings/connections`. Screenshot `04-settings-connect.png`.

**Severity: P2** (copy)

### B-21-2 · Onboarding progress dots have no accessible name

**Flow:** `#/onboarding`. Group `aria-label="Progress"`.  
**Expected:** each step named (Engines / Workspace / Meet).  
**Actual:** three `<span class="po-dot">` with `data-on` / `data-done` and no `aria-label`. Dump `dots[].label` is null. They also paint as traffic-light window controls.

**Severity: P2** (a11y)

### B-21-3 · Onboarding **back** / **next** / **add** are sentence-case

**Flow:** steps 1–2.  
**Expected:** title-case like **Start the orchestrator**.  
**Actual:** visible labels **back**, **next**, **add**. Screenshot `07-onboard-engines.png`, `08-onboard-workspace.png`.

**Severity: P2** (visual)

### MDF-21 counts

- P0: 0
- P1: 0
- P2: 3
- Electron: not launched
- MDF-48 fork-home default: **verified**

---

## MDF-53 Temps History 1024 re-check

Tester (`tester-mv2fnyz5`) · 2026-10-10 · **no fixes applied** · god inform conv-5b0bb2.

`0af3614c` / `604535ba` / merge `47b91346` on fork/main. Gallery `http://127.0.0.1:5183/paper.html#/temps` from the **main clone**. Developer :5179 left running. Evidence `/tmp/mdf53-qa/`. Electron not launched. Hard reload before each route.

Re-check of **B-20-1**: History collided with the footer at 1024×640 (header ghosted through **184k live tokens**, Slack clipped to **Sla**, body rows gone). Folded P2s **B-20-2..6**.

### Result

| Viewport | Live h | History bottom | Footer top | Overlap | History columns |
| --- | --- | --- | --- | --- | --- |
| 1280×900 | 211 | 844 | 856 | **false** | Objective / Started / Runtime / Tokens / $ / Result / Slack |
| 1024×640 | 123 | 592 | 600 (8px gap) | **false** | same six, all labelled |

`.pw-history` flex-grows; `.pw-table-wrap` is `overflow: auto` (1024 wrap 706×151, table `scrollH` 208 > `clientH` 149 — third row is in the scroll). Footer shortcut row (`j`/`k` move, Enter open, `x` stop) stays fully visible. Live strip compact at `max-height: 700px`. Screenshots `01-temps-1280.png`, `02-temps-1024.png`.

**B-20-1 verified.**

Folded P2s:

- **B-20-2 verified.** Pending hint `href` is `#/settings/autonomy` (`Settings › Autonomy & Budgets`).
- **B-20-3 verified.** Computed meta / URL / `--paper-text-xs` are **12px**.
- **B-20-4 verified.** History sheet title is the objective (**Finish the Memory browser (MDF-18): cards, list, graph and knowledge tab.**). Badges `["done"]` once. Screenshot `03-sheet.png`.
- **B-20-5 verified.** Add connection on empty GitHub template: `hasSecretSaved` **false**, no “A secret is saved…”. Screenshot `05-add.png`.
- **B-20-6 verified.** Per-row `aria-label`s **Test GitHub** / **Remove GitHub**, **Test Linear** / **Remove Linear**, **Test httpbin (public)** / **Remove httpbin (public)**. Screenshot `04-conn.png`.

No P1 reopened. No new P0/P1/P2 this pass.

