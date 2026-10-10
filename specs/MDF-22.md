# MDF-22 Archive and reopen agents, detachable windows

## Archive and reopen
**User goal:** stop an agent without losing its work, and bring it back later.

- In the agent's menu (sidebar and agent room), the user can pick **Stop** (ends the process; memory, worktree and inbox are kept) or **Archive** (stops the agent and hides it from the sidebar). A confirmation `Dialog` names what is kept.
- **Archived agents:** a sidebar footer entry and a `/agents/archived` list showing name, role, archive date, last task and disk used, with Reopen and Delete permanently buttons. Delete permanently needs the agent's name typed in.
- **Reopen** brings back the agent with the same id, worktree and session, using the existing resume path.
- **States:**
  - Empty: "No archived agents".
  - Error: the worktree is missing. Offer "Reopen with a fresh worktree".
- **Data:** `hive:setArchived(id, archived)` (`src/main/index.ts:3542`), `roster:read` and `roster:write`, resume through `pty:spawn` and `main/roster.ts`, and the `archived` flag in `paper/data/hive.ts`.
- **New:** a `hive:deleteAgent` that removes the worktree and agent folder only after confirmation.

## Detachable windows
**User goal:** put the IDE, a terminal or the office floor on a second monitor.

- A **Detach** `IconButton` in the IDE header, the agent room terminal and the Office view. It opens that view in its own window and leaves a "Shown in another window — Bring back" placeholder behind.
- Closing the detached window brings the view back into the main window. Each window remembers its size and position.
- **Data:** `BrowserWindow` creation in `src/main/index.ts:2323` and the `window:newFloor` pattern (line 3820); `ide/IdePanel.tsx`; terminal pool `components/terminalPool.ts`. The pty session is shared, never spawned again.
- **New:** `window:detach(view, params)` and `window:attach`, which route by query string to a minimal renderer entry.

**Keys:** `⌘⇧D` detaches or brings back the focused view, `⌘⌫` archives the selected agent after a confirmation.

## Acceptance
1. When an agent is archived and later reopened, its memory, inbox and worktree changes are still there, and its session resumes.
2. Archived agents are not woken by triggers. A message sent to one is kept for when it is reopened.
3. A detached terminal shows the same live session. Typing in it reaches the same process, and no second pty is started.
4. Closing a detached window reattaches the view with no lost output.
5. Window positions are restored after the app restarts.
