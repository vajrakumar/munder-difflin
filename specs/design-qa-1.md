# Design QA 1: Paper shell, Pro sidebar, Inbox, ⌘K, gallery

Reviewer: Dwight · 2026-10-10 · Build: `fork/main` at `3adf932d`. I served `paper.html` and `gallery.html` from a clean export of that commit, because the shared `:5179` server was serving a working tree in the middle of an edit. I captured them in headless Chrome at 1440×900 and 1024×640, in light and dark. The check is against `DESIGN.md` (Paper v1).

**Fix round (MDF-46, Toby / `feat/design-qa-1`):** start `232c9aaa`. P1 then P2. Skip P3. Do not edit screens/tasks, automations, or memory.

| # | Pri | Status |
| --- | --- | --- |
| 1 | P1 | fixed — default `system`, sun/moon menu (System/Light/Dark/HC), persisted |
| 2 | P1 | fixed — Inspector hidden by default on Inbox; title `max-width: 760px` |
| 3 | P1 | fixed — shell ≤1100 Inspector is a Sheet; Inbox push list→detail under 840 |
| 4 | P1 | fixed — window-level j/k/e/r/Enter; focus `.pi-rows` on enter; empty-state hint |
| 5 | P1 | fixed — danger only for needs-you; Question is neutral; unread is accent |
| 6 | P1 | fixed — raw px font-size → `--paper-text-*`; `tools/check-paper-font-size.cjs` + `.stylelintrc.cjs` (skip tasks) |
| 7 | P1 | fixed — `--paper-focus-ring` on list; palette input uses accent bottom border (DESIGN.md) |
| 8 | P1 | fixed — Notes collapsible + horizontal splitter, agents `flex:1` min 4 rows, split persisted |
| 9 | P2 | fixed — shared status string; `$ today` tnum; voice + account; Classic UI in account menu |
| 10 | P2 | fixed — folder/person tooltips; icon-rail counts are dots; 180px labelled rail |
| 11 | P2 | fixed — thread cards omit subject when it matches the header |
| 12 | P2 | fixed — meta muted; ticket keys are accent links with hover underline |
| 13 | P2 | fixed — Agents & notes only is a sidebar ⋯ checkbox + ⌘K action |
| 14 | P2 | fixed — notes search uses pane `--paper-space-2` inset |
| 15 | P2 | fixed — icons, match bold, `Kbd` shortcuts, footer, word-start rank, recents first |
| 16 | P2 | fixed — palette scale 0.98→1 / 200ms, scrim 120ms |
| 17 | P2 | fixed — disabled btn neutral-3/8; composer `resize:none` auto-grows to 8 lines |
| 18 | P2 | fixed — Inspector collapses when nothing is selected (no filler) |
| 19–25 | P3 | skipped |

**How it's ranked:** P1 means it breaks a DESIGN.md rule or a core flow. P2 is a visible polish issue. P3 is a refinement. Paths are relative to `src/renderer/src/`.

## P1: rule breaks and broken flows

1. **Dark mode ignores the system setting.** With the OS set to dark, the app still opens in light mode. The only control is a bare text toggle, and the `hc` theme can't be reached from it.
   - **Where:** `paper/PaperApp.tsx` (`paperThemeFromRoot`, theme toggle around line 130); there is no `matchMedia` anywhere in `paper/` or `design/`.
   - **Fix:** default to `system`, which follows `prefers-color-scheme` and listens for changes. Replace the "light" text with an `IconButton` (sun/moon) that opens a `Menu` with System, Light, Dark and High contrast. Persist the choice.

2. **Inbox has 5 columns at 1440, so the reading pane is cramped.** The columns are sidebar 280, filter rail 60, list 340, detail about 425, and the empty Inspector 330. The detail title wraps after 3 words ("Can I test on your / device after MDF-11?").
   - **Where:** `paper/PaperApp.tsx` (inspector slot), `paper/screens/inbox/inbox.css` (header title width).
   - **Fix:**
     - Hide the Inspector by default on Inbox, since the detail pane is the inspector there. Remember the toggle per route.
     - Let the detail title use the full pane width (`max-width: 760px`, like `.pi-scroll`).

3. **At 1024×640 the Inbox loses its reading pane** and keeps the empty Inspector.
   - **Where:** `inbox.css` container queries at lines 555 and 572; the shell inspector.
   - **Fix:** at a shell width of 1100 or less, auto-collapse the Inspector to an overlay `Sheet`. Under 840, the Inbox shows list → detail as a push navigation with a back button; it never just hides the detail.

4. **j/k does nothing when the Inbox opens.** After loading `#/inbox`, pressing `j` twice left the selection on row 1, because focus isn't in the list. DESIGN.md §1.2 says "j/k triage on lists".
   - **Where:** `paper/screens/inbox/screen.tsx`.
   - **Fix:** handle j, k, e, r and Enter at screen level whenever focus is not in a text field, and move focus to `.pi-rows` when the route is entered. Add a "j/k to move" hint in the empty state.

5. **"Needs you" uses three colours.** "Needs reply" is a warning (amber) chip, "Question" is a danger (red) chip, unread dots are red or blue, and the sidebar "asked" pill is red. §2.1 says "needs the human" is `danger-9`, and principle 3 is one colour language.
   - **Where:** `inbox.css` chip and dot classes, `paper/screens/inbox/badge.ts`, `paper/Sidebar.tsx` (asked pill).
   - **Fix:** use danger only for "needs you": the "Needs reply" chip, the sidebar "asked" pill and the Inbox count. "Question" becomes a neutral type tag. Unread is a single accent dot.

6. **Sizes outside the type scale.** I found 7 or more hard-coded `font-size: 11px` (`shell.css` lines 134, 240, 305 and 443; `inbox.css` lines 75, 85 and 104). The scale starts at `xs` = 12/16.
   - **Fix:** replace them with `var(--paper-text-xs)`. Add a stylelint rule that bans raw `px` font sizes in `paper/` and `ui/`.

7. **Focus rings don't match.**
   - The list uses `inset 0 0 0 2px accent-7` (`inbox.css:199`).
   - The palette input has `outline: none` with nothing in its place (`shell.css:440`, `inbox.css:181`).
   - §4 says `--paper-focus-ring` everywhere, and never `outline: none` without a replacement.
   - **Fix:** use `box-shadow: var(--paper-focus-ring)` for every `:focus-visible`. The palette input shows focus with the accent bottom border it already has, which is acceptable, but document it.

8. **The sidebar agent list gets crushed by Notes.** At 900px tall, only 5 agents fit and the 5th, Dwight, is cut off. At 640 only 2 fit, and the Notes search field is clipped in half.
   - **Where:** `paper/Sidebar.tsx`, `paper/NotesPane.tsx`, `shell.css`.
   - **Fix:** make Notes a collapsible section that starts at 3 rows and can be resized by a `Splitter`. The agents list gets `flex: 1` with a minimum of 4 rows. Persist the split.

## P2: visible polish

9. **The title bar is missing §5 items** ("$ today", voice, account). Status reads "3 live · 1 asked · 5 agents", while the Home subtitle says "on the floor". **Fix:** use one shared string for both, and add "$ today" with tabular figures. Put voice and account `IconButton`s on the right. Move "Classic UI" into the account menu, since a primary-looking button for leaving Paper sits too high in the hierarchy. (`paper/PaperApp.tsx`)

10. **The filter rail in the Inbox is unlabelled.** It shows only icons and avatars, and the count badges cover the avatar initials (Mi, DE, Ph, KE are clipped). **Fix:** give each icon a `Tooltip` with its label. Move the badges to a small dot, or put the count below the icon. At 1440 or wider, expand the rail to 180px with labels, like a mail client's folder list. (`inbox.css` `.pi-folder` and `.pi-person`)

11. **The message title is repeated** in the detail header and again inside the first message card. **Fix:** keep the title in the header only, so the card starts with the body. Sender and time stay in the card. (`screens/inbox/screen.tsx`)

12. **Meta rows use link blue for things that aren't links** ("· question MDF-11", "question" on the message card). **Fix:** use `--paper-text-muted` for meta. Use accent only for clickable ticket keys, which also get a hover underline and open the task sheet.

13. **The "Agents & notes only" button looks like a call to action** pinned at the bottom of the sidebar. **Fix:** move it to a sidebar header `Menu` (⋯) as a checkbox item. Add a ⌘K action, which already fits the pattern. (`paper/Sidebar.tsx`)

14. **The Notes search field has no right gutter.** It runs to the sidebar edge, while every other element keeps an 8px inset. **Fix:** use the same `--paper-space-2` inline padding as the nav. (`paper/NotesPane.tsx` / `shell.css`)

15. **The ⌘K palette has no icons, shortcut hints, match highlight or footer.** **Fix:**
    - Each item shows an icon, its label with the matched characters in bold, and a `Kbd` shortcut on the right ("G I" for Inbox).
    - The footer shows "↑↓ to move · ↵ to run · esc to close".
    - "New note" matching "mem" is fuzzy noise, so raise the fuzzy threshold or rank by word starts.
    - Recent actions show first when the query is empty.
    - (`paper/CommandPalette.tsx`)

16. **The palette appears and disappears with no motion.** **Fix:** scale from 0.98 to 1 plus a fade over `--paper-duration-base` (200 ms) with `--paper-ease`; the scrim fades over 120 ms. Both are already zeroed under reduced motion by the tokens.

17. **The disabled Send button reads as washed-out primary blue,** and the textarea shows a native resize grip. **Fix:** disabled buttons use neutral-3 background with neutral-8 text, following the `ui/Button` disabled variant. The composer grows automatically up to 8 lines with `resize: none`. (`inbox.css .pi-composer`)

18. **The Inspector placeholder shows on every route** ("Hover an agent for ticket details…"). **Fix:** when nothing is selected, collapse the Inspector. When something is, show route context: on Inbox the sender agent card and ticket; on Home the hovered agent. Never show instructional filler text.

## P3: refinements and gallery

19. **The gallery shows only the default states.** **Fix:**
    - Add a row per component for hover, focus-visible, active, disabled and loading.
    - Add a light/dark/hc grid shown side by side.
    - Add the missing primitives: Checkbox, Switch, Radio, Textarea, Segmented control.
    - The gallery is the QA surface for MDF-7, so states matter more than variety.
    - (`gallery.tsx`)

20. **Gallery table: numbers are left-aligned, and status is plain text.** **Fix:** money and token columns are right-aligned with `tnum`; Status uses `Badge` with the status language. Make this the `ui/Table` default for `align="num"` columns.

21. **Trigger buttons look like plain text** ("Ghost", "Popover", "Toast"). **Fix:** ghost buttons get a hover background `neutral-3` and a visible focus ring. Use `secondary` for demo triggers.

22. **Avatar rings are all similar mid-tone outlines,** and the initials are low contrast on the pale fill (DW, PH). **Fix:** the ring colour comes from the status token (§2.1), and the fill from the agent accent at step 4 with text at step 11, which gives at least 4.5:1. Initials use semibold 12 in all caps. (`ui/Avatar.tsx`)

23. **The "AGENTS" section label and the project group headers compete,** with both a small-caps style and a chevron row. **Fix:** "Agents" uses the same xs muted label as Inbox's "TODAY". Project headers use sm medium neutral-11 with the count on the right in xs muted.

24. **The Inbox "Needs you" header count (4) is plain text next to the title.** **Fix:** use a `Badge` of the danger-subtle variant to match the sidebar count, or a muted "· 4". Choose one pattern and apply it to Tasks and the others.

25. **The empty state uses about 40px of air above the content and a large gap above the Splitter.** **Fix:** screen sections stack with `--paper-space-8` (32), and empty states centre vertically in the remaining space rather than sitting about 140px from the top.

## Seen on the live `:5179` tree (Home tiles, MDF-12, not merged), for Developer
- The cost position jumps between cards: it is right-aligned when there is no ticket chip, and next to the status when there is one. Give the footer a fixed layout: status on the left, ticket chip, then cost on the far right.
- Status words ("idle", "waiting") are plain lowercase text. Use the status `Badge` or a dot plus label.
- The project filter is a native `<select>`, while the gallery has `ui/Select`. Use `ui/Select` at 32px high so it matches the chips and the search field.
- At the time of capture, the tree had an HMR error: `sidebarState.ts` does not export `useProSidebar`, and the page rendered blank. It's probably a mid-edit state, but worth checking before merge.
