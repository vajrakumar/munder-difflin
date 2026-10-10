# MDF-20 Temps and Connections

## Temps (`/temps`)
**User goal:** see the temps (short-lived workers) the orchestrator hired: what each one did, what it cost, and how it ended.

- **Live strip:** running temps as `Card`s showing objective, runtime counter, tokens, a Stop button, and Open terminal (which opens the agent room).
- **History table:** Objective · Started · Runtime · Tokens/$ · Result (done / failed / stopped) · Slack thread link. A filter by date and by result. Clicking a row opens a `Sheet` with the full objective, the final report and the failure reason.
- **Pending requests:** files still sitting in `spawn-requests/`, shown with a "temps switch is off" hint and a link to Settings › Autonomy.
- **States:**
  - Empty: "No temps yet. The orchestrator hires one when a job needs it."
  - Loading: skeleton rows.
  - Error: shown inline, with Retry.
- **Data:** `workers:list` and `workers:stop` (`src/main/index.ts:5064`) and `main/workerLaunch.ts`, plus the hive folders `spawn-requests/`, `.done/` and `.failed/` (`main/hive.ts`, around line 1584). Usage comes from `hive:agentUsage`.
- **New, small:** a persisted temp history (in SQLite through `main/db.ts`) holding id, objective, start, end, tokens, cost and result, because `workers:list` shows only the temps that are live now.
- **Keys:** `j`/`k` plus `Enter` open a temp, `x` stops the selected one after a confirmation.

## Connections (`/settings/connections`, also linked from Capabilities)
**User goal:** add a REST API that agents can call without ever seeing its key.

- A list of integrations (`Table`) with a status `Badge` (OK, failing or untested) and a Test button. **Add** opens a `Sheet` with a template `Select`, base URL, auth type and a masked secret.
- **Data:** `integrations:list`, `integrations:templates`, `integrations:upsert`, `integrations:setSecret`, `integrations:test` and `integrations:remove` (`main/integrations.ts`, with keys held by the broker in `main/integrationBroker.ts`).
- **Keys:** `n` adds a connection, `t` tests the selected one.

## Acceptance
1. A temp started from `spawn-requests` appears in the Live strip within 3 s, and in History when it ends, with its tokens filled in.
2. Stop ends the temp's process tree and records the result `stopped`.
3. History survives an app restart.
4. A secret is never sent back to the renderer after it is saved; only `hasSecret` is returned.
5. Test reports the HTTP status and how long the call took.
