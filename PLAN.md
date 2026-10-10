# Vajra's Office: product plan (MDF-2)

Product name: **Vajra's Office**, a fork of Munder Difflin.

Author: Dwight · 2026-10-10 · Status: approved; scope decisions from the human on MDF-35 applied

**Goal.** Build a fork that has every feature in the paid **Pro** plan, adds more, and wraps it in a modern, polished interface. The pixel office stays as an optional view. UI/UX quality comes first.

**Rule.** We rebuild Pro features from their public descriptions only: the website, blog posts, release notes and the labels shown in the installed app. We never copy closed-source code. The open-source base is MIT licensed. The office tilesets are LimeZu assets bought under a licence that requires attribution, so a new look must either drop them or keep that attribution (`LICENSE-ASSETS`).

---

## 1. Free feature inventory (open-source repo, `package.json` 0.4.6 + Unreleased)

Each line names the feature and where its code lives. Paths are relative to `src/`. "Components" means `src/renderer/src/components/`.

| Area | Features | Main source |
|---|---|---|
| Agents and providers | 13 coding-agent engines: Claude, Codex, Grok, Kimi, Gemini, Antigravity, Qwen, OpenCode, Crush, pi, Copilot, Cursor, custom. Each agent runs in a real terminal process. Add, edit and rename agents. Model picker with a remote catalog. Bring your own keys, or use local models (Ollama, LM Studio). A missing CLI installs itself. Resume sessions and restore a team. Each agent can get its own git worktree. | `shared/agentProvider.ts`, `main/pty.ts`, `main/cliInstall.ts`, `main/roster.ts`, components `AddAgentModal.tsx` |
| Orchestrator | "Michael" is the god (orchestrator) agent, and its engine can be swapped. "Dwight" is the prep assistant. Shareable hires through `munderdifflin://hire` links, an Agent Gallery and a review queue. | `shared/godIdentity.ts`, `main/hire.ts` |
| Office floor | Pixi.js scene: tiled maps, camera, pathfinding, seats, cafeteria. Tool, thought and message bubbles. TV-show themes. Several floors, each in its own window. Hive picker. | `renderer/src/scene/office/*`, components `HivePicker.tsx` |
| Command Center | 11 tabs: terminal, floor, tasks, ASK ME, triggers, history, memory, graph, activity, skills, workers. Fleet gauges and a tool waterfall. | components `CommandCenterPanel.tsx`, `ToolWaterfall.tsx` |
| Terminals | xterm.js pool with recovery, font zoom and clickable paths. Fullscreen terminal with a roster rail. Message queue composer that takes attachments. Right-to-left support. | components `PtyTerminalView.tsx`, `FullscreenTerminal.tsx`, `MessageQueueComposer.tsx` |
| Tasks | Kanban with dependencies and IDs. Detail overlay showing the question-and-answer trail. | components `TasksKanban.tsx`, `TaskDetailOverlay.tsx`, `shared/taskLedger.ts` |
| ASK ME | Queue of questions for the human, with markdown and a blocked banner. | components `AskMeTab.tsx`, `BlockedBanner.tsx` |
| Memory | MemPalace semantic memory, a reflector that condenses old notes, a search panel, a memory graph drawn in SVG, and a knowledge graph. | `main/memory.ts`, `main/reflect.ts`, `main/knowledge.ts`, components `MemoryGraphPanel.tsx` |
| Messaging | Hive: a git repo holding inbox and outbox folders, a router, `board.md` and `log.jsonl`. Threads panel. Broadcast. Wake nudges. | `main/hive.ts`, components `ThreadsPanel.tsx` |
| Triggers | Schedules with weekdays. A trigger that fires when context fills up (auto-compact). Webhooks with a secret, exposed through a tunnel. History. Catch-up for runs missed while the app was closed. | components `triggers/*`, `main/webhook.ts`, `main/triggerHistory.ts` |
| Integrations | Integrations registry with an encrypted secret store. Loopback broker that keeps keys away from agents. MCP default catalog. GitHub issue and CI watcher. | `main/integrations.ts`, `main/integrationBroker.ts`, `shared/mcpCatalog.ts`, `main/github.ts` |
| Skills | Installed skills plus a remote catalog to install and uninstall from. | `main/skills.ts`, components `SkillsTab.tsx` |
| IDE and git | Monaco editor, file tree, diff view, markdown preview. Git changes, history, compare and commit graph. | `renderer/src/ide/*`, `main/git.ts`, components `GitTab.tsx` |
| Voice | Realtime voice Michael over WebRTC with a cost display. Free Flow dictation through Groq Whisper. | `main/realtime.ts`, `main/freeflow.ts` |
| Control and budgets | Circuit breaker that escalates steer, then constrain, then stop. Per-agent token caps. Cost ledger. Pause, halt, steer and 1:1 hold. Graceful quit. SQLite state store. | `main/breaker.ts`, `shared/tokenCaps.ts`, `main/control.ts`, `main/db.ts` |
| Slack and temps | Slack events reach Michael and replies go back to the thread. Temps start from `spawn-requests/` in their own worktree. | `main/slack.ts`, `main/workerLaunch.ts`, components `WorkersTab.tsx` |
| Platform | Settings with 7 sections and one Save. Light and dark themes. Interface in English, Chinese and Arabic (right-to-left). Auto-updater. "What's new" screen after an update. Onboarding wizard. Usage telemetry through OpenTelemetry and PostHog, with opt-out. | components `SettingsModal.tsx`, `OnboardingWizard.tsx`, `main/updater.ts`, `main/analytics.ts` |

**Licence gating:** the code has no licence check at all. "Pro" appears only as marketing copy in `SettingsHeroCard.tsx` and in the remote `hero.json`.

## 2. Paid (Pro) feature list, from public sources and v0.5.5 UI labels

Price: $150 a year at launch (list $200), or $20 a month. Prices are adjusted for purchasing power by country. One machine per licence. A separate Teams plan is priced by call.

Source keys: `S` munderdiffl.in (home page, #pricing, FAQ) · `B2` [0.5.2 launch blog](https://munderdiffl.in/blog/launching-munder-difflin-v0-5-2/) · `B3` [0.5.3 blog](https://munderdiffl.in/blog/munder-difflin-0-5-3/) · `R` upstream README · `GH` GitHub release notes for 0.5.x · `APP` English labels in the installed v0.5.5 app (read for reference only).

| # | Pro feature | What it does | Sources |
|---|---|---|---|
| P1 | Pro workspace and sidebar | A sidebar with Agents, Tasks, Inbox, Automations, Memory, Capabilities, Stapler, Temps and Team. You can switch between Classic and Pro, and pick which one opens by default. | S, B2, R, APP |
| P2 | Sidebar extras | Agents grouped by project. A one-line live status for each agent. An "Asked you" flag. Private searchable notes. Drag to reorder agents ("Keep my agent order"). Resizable width. An "agents and notes only" mode. Ticket details on hover. | R, B3, APP |
| P3 | Agent rooms | One agent's live terminal side by side with a panel for its engine, workspace, capabilities and budget. | B2, APP |
| P4 | Orchestrator screen | Terminal, messages, routing, budget and breaker, board, configuration and restart, all on one screen. | B2 |
| P5 | Inbox | Questions for you, mail between agents, outside messages (Slack and webhooks) and team direct messages, all in one place. | B2, APP |
| P6 | Automations | Schedules and webhooks with a secret, a schema, quiet hours, guardrails and history. Webhook sources include GitHub, Linear and Telegram. Agents can manage automations themselves. | APP, R, GH 0.5.3/0.5.5 |
| P7 | Memory browser | Search by meaning. View results as cards, a list, or a graph of agents and topics. | B2, APP |
| P8 | Capabilities | MCP servers, skills and tools per agent. Tabs for Marketplace, Installed and "Who has what". One-click role bundles. | B2, APP |
| P9 | Temps view | History of short-lived workers: task, runtime, tokens and result. | B2, APP |
| P10 | Connections | REST APIs your agents can call. The key stays in the app's vault. | APP (inferred from labels) |
| P11 | Stapler | A floating ring above every app with Screenshot plus note, Record message (up to 5 minutes), Record meeting and Make invisible (hides it from screen sharing). Captures go to the orchestrator or to one agent you pick. | S FAQ, R, B2, APP |
| P12 | Dictation into any app | System-wide hold-to-talk using a bundled local Whisper model, with an optional large-v3-turbo model. Text goes in at the cursor. | S, R, GH 0.5.3/0.5.5 |
| P13 | Meeting transcription | Records both sides of a call (labelled You and Them) on your machine. You can search, rename and correct the transcript, then send it to an agent. Audio is deleted after 24 hours. | R, B2, APP |
| P14 | Paste an image into the composer | Paste a picture straight into the message box. | B3 |
| P15 | Signed build, licence and billing | Signed and notarized app. Licence key. Account menu with Subscription & billing and Archived agents. | B2, APP |
| T1 | Teams plan (beyond Pro) | Orchestrators that talk across machines. Seats by invite code. Direct messages and file sharing. A roster showing who is online. Admin console. | S, B2, APP |
| Next | Vendor roadmap | Sandboxes, browser use, Team Brain, mobile app, computer use, remote control. | APP "Coming next", S |

Also shipped in 0.5.x and not clearly marked Pro (we build these regardless):
- Ticket keys
- A Tasks tab per agent with date filters
- Stop and Archive that keep work and can be reopened
- IDE that detaches into its own window
- Missing-CLI install card
- Settings redesign
- Voice Michael can read a terminal
- Auto-compact every 40 minutes at 30% context

## 3. Gap table (fork today = open-source code)

| Feature | In fork today | Gap | Effort |
|---|---|---|---|
| P1/P2 Pro sidebar and workspace | No. Only the floor plus the Command Center tabs | New app shell (see section 4) | L |
| P3 Agent rooms | Partly: `AgentDetailPanel` and the fullscreen terminal exist | Room layout plus config panel | M |
| P4 Orchestrator screen | Partly: Command Center | Rebuild as one dedicated screen | M |
| P5 Inbox | Partly: ASK ME, Threads, Slack | One merged inbox with filters | M |
| P6 Automations | Partly: Triggers (schedules, webhooks, history) | Schema, quiet hours, guardrails, GitHub/Linear/Telegram source presets, editing by agents | M |
| P7 Memory browser | Partly: search plus SVG graph | Cards/list/graph views, better graph | M |
| P8 Capabilities | Partly: Skills tab plus MCP defaults | Marketplace, "who has what" matrix, role bundles | M |
| P9 Temps | Partly: Workers tab | History with runtime, tokens and result | S |
| P10 Connections | Yes: integrations registry and broker | UI polish only | S |
| P11 Stapler | No | Floating always-on-top window, capture, hide from screen sharing | L |
| P12 System-wide dictation | Partly: Free Flow uses Groq in the cloud | Local whisper.cpp, global hotkey, insert at the cursor | L |
| P13 Meeting transcription | No | Capture system audio and mic, local Whisper, label speakers, meeting library | XL |
| P14 Paste image | Partly: attachments exist | Paste handler | S |
| Ticket keys, per-agent tasks, archive | Partly | Port to match 0.5.3/0.5.5 behaviour | S–M |
| P15 Licensing | Not needed in our fork | Skip; we keep everything unlocked | — |
| T1 Teams | Config only (`OrgSection`), no transport | Peer-to-peer or relay transport, seats, roster | Deferred (out of scope) |

## 4. UI/UX direction

**Principle:** a calm, dense, keyboard-first workspace in the class of Linear, Raycast and Arc. The pixel office stays as an optional view inside the new shell, keeping its existing art. Everywhere else, the pixel styling goes: no Press Start 2P, no SNES borders, no hard 4px shadows in the app chrome.

### 4.1 Design system ("Paper" v1)
- **Tokens:** one source, `design/tokens.ts`, which generates CSS variables. Colours are defined in OKLCH (a colour format where equal number steps look equally different). Each colour has a 12-step scale: neutral, accent, and success/warning/danger/info. Light, dark and high-contrast themes come from the same tokens. Spacing uses a 4px base; corner radius steps are 6, 8, 12 and 16; there are 3 elevation (shadow depth) levels; motion tokens set durations of 120, 200 and 320 ms with standard easing, and honour the system "reduce motion" setting.
- **Type:** Inter variable for the interface, with tabular numbers in data. JetBrains Mono for code and terminals. Six-step type scale (12, 13, 14, 16, 20, 28).
- **Components:** Radix UI primitives (unstyled and accessible) plus our own styling. One component library inside `renderer/src/ui/`: Button, IconButton, Input, Select, Combobox, Tabs, Dialog, Sheet, Popover, Tooltip, Menu, Toast, Badge, Avatar, Card, Table, EmptyState, Skeleton, Kbd, Splitter. Icons: Lucide. Styling uses CSS Modules or vanilla-extract on the tokens (tooling decision for Developer; no inline styles in new code).
- **Agent identity:** each agent gets a generated vector avatar (initials or a glyph on its accent colour) and a status ring that animates for thinking, working, waiting, blocked and looping. One status colour language is used everywhere.
- **Quality gates:** WCAG 2.2 AA contrast, full keyboard access, visible focus rings, right-to-left and Chinese/Arabic layouts, a minimum window size of 1024×640.

### 4.2 Layout (app shell)
```
┌ Title bar: workspace switcher · ⌘K search · status (agents running, $ today) · voice · account ┐
├ Sidebar (resizable, collapsible) ─┬ Main view ─────────────────────────────┬ Inspector (optional) ┤
│ Inbox (badge)                     │ routed screen                          │ context for selection│
│ Tasks · Automations · Memory      │                                        │                      │
│ Capabilities · Temps · Stapler    │                                        │                      │
│ ── Agents (grouped by project,    │                                        │                      │
│    drag order, live line, "asked")│                                        │                      │
│ ── Notes                          │                                        │                      │
└───────────────────────────────────┴────────────────────────────────────────┴──────────────────────┘
```
- **⌘K command palette** for every action: spawn agent, message agent, jump to screen, run automation, search memory.
- **Split panes and tabs** in the main view; the IDE and terminals can be detached into their own windows.
- **Notifications centre** in place of scattered toasts; toasts are used only for an action you just took.

### 4.3 Key screens
1. **Home / Floor.** The default screen. A live grid of agent tiles (avatar, status ring, current tool, last line, tokens and cost, "asked you" chip) with filters. An optional **Office view** shows the existing pixel office (Pixi), embedded in the new shell and fed by the same live data.
2. **Agent room.** Terminal on the left (we keep xterm), with tabs for Overview (engine, model, budget, worktree), Messages, Tasks, Git diff and Traces (tool waterfall) on the right. Composer pinned at the bottom with attachments and image paste.
3. **Orchestrator.** Same as an agent room, plus a routing log, the board, breaker controls and a fleet budget chart.
4. **Inbox.** Three columns: filters (Needs you · Agents · Outside · Team), list, detail. Inline answer for questions on ASK ME cards. Keyboard triage with j/k, e and r.
5. **Tasks.** Board, list and timeline views. Ticket keys, dependency lines, filters for owner, status and date. Detail opens as a side sheet.
6. **Automations.** List with run history; an editor for schedule (with natural-language input and a cron preview), webhook (URL, secret, schema, sample payload), quiet hours and guardrails.
7. **Memory.** Search box with Cards, List and Graph views; the graph uses WebGL with a force layout and topic clusters.
8. **Capabilities.** Marketplace, Installed, and a "Who has what" matrix (agents × skills/MCP) with role bundles.
9. **Stapler.** A small floating ring window plus a meetings and captures library.
10. **Settings.** Searchable, with grouped sections and one Save; there is a diff preview before saving.
11. **Onboarding.** Three steps: choose engines (auto-detect), pick hive folder, meet your orchestrator. A sample project lets the user see value in under 2 minutes.

### 4.4 Beyond Pro (our differentiators)
- **Replay timeline:** scrub through what an agent did (tool spans, messages and diffs), built on the telemetry we already collect.
- **Cost and limit dashboard:** spend per agent, model and day, with forecasts against plan limits.
- **Approvals centre:** one queue for permission prompts across all agents, with approve or deny that can be remembered.
- **Diff review flow:** review an agent's worktree changes, comment on them, and merge, all inside the app.
- **Templates:** starter offices (for example "web app team" or "research desk") that can be shared through hire links.
- **Accessibility and themes:** high contrast, user accent colour, adjustable density (compact or comfortable).

## 5. Phased roadmap (each item sized as one card)

Sizes: **S** is under a day, **M** is 1 to 3 days, **L** is 3 to 5 days.

**Phase 0: Foundation**
1. Write the design system spec as a new DESIGN.md, plus a token package covering OKLCH scales, the light/dark/high-contrast themes, type and motion. (M)
2. Build the UI component library on Radix, with a Storybook-style gallery page. (L)
3. Set up the new app shell: title bar, resizable sidebar, router, inspector slot, and a feature flag to fall back to the classic UI. (L)
4. Add the ⌘K command palette and an action registry. (M)
5. Add agent identity: vector avatars, status ring and the status colour language. (S)

**Phase 1: Pro workspace parity**
6. Sidebar: agents grouped by project, drag order, live line, "asked you" flag, notes, hover cards. (M)
7. Home: live agent tile grid with filters. (M)
8. Agent room screen, including image paste. (L)
9. Orchestrator screen. (M)
10. Unified inbox. (L)
11. Tasks with board, list and timeline views, ticket keys, filters and side-sheet detail. (L)
12. Automations screen covering schema, quiet hours, guardrails, webhook presets and history. (L)
13. Memory browser with cards, list and a WebGL graph. (L)
14. Capabilities with marketplace, "who has what" matrix and role bundles. (L)
15. Temps history and Connections screens. (M)
16. Settings redesign (searchable) and new onboarding. (L)
17. Archive and reopen agents; detachable IDE and terminal windows. (M)

**Phase 2: Stapler and voice**
18. Local Whisper engine (whisper.cpp) with model download and management. (L)
19. System-wide hold-to-talk dictation that types at the cursor, on Mac, Windows and Linux X11. (L)
20. Stapler floating ring: screenshot plus note, record message, route to an agent, hide from screen sharing. (L)
21. Meeting capture: system audio plus mic, labelled You and Them, local transcription, meeting library. (L, may split into 2)

**Phase 3: Beyond Pro**
22. Office view: embed the existing pixel office as an optional view in the new shell, with a toggle and the same live data. Keep the LimeZu attribution. (M)
23. Replay timeline for an agent. (L)
24. Cost and limit dashboard. (M)
25. Approvals centre. (M)
26. In-app diff review and merge. (L)
27. Office templates gallery. (M)

**Phase 4: Teams (DEFERRED by the human, 2026-10-10; MDF-33 and MDF-34 parked)**
28. Design spec for cross-machine orchestrator messaging (sealed, per device). (M)
29. Seats, invite codes, roster and presence. (L)

**Cross-cutting, every phase:**
- Tester runs accessibility and visual-regression checks on each new screen.
- i18n keys for every new string.
- The packaging pipeline (MDF-4) ships each phase.

**Decisions (human, MDF-35, 2026-10-10):**
1. Keep the pixel office as an optional view in the new UI.
2. Teams is out of scope for now; Phase 4 (MDF-33, MDF-34) is deferred.
3. The product name is **Vajra's Office**. Use it for the app name, window title and onboarding. Packaging (MDF-4) uses its own bundle ID next to the installed app.
