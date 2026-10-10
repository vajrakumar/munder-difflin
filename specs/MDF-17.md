# MDF-17 Automations

**User goal:** see, create and trust the work that runs on its own: schedules, webhooks and the auto-compact trigger.

**Screens and states**
- **List** (`/automations`): a `Table` with columns Name · Type (Schedule/Webhook/Context) · Next run or URL · Last result · On/off switch. A segmented filter offers All, Schedules, Webhooks and History.
  - Empty: "Nothing runs on its own yet", with buttons for New schedule and New webhook.
  - Loading: skeleton rows.
  - Error: the failing IPC call is named, with a Retry button.
- **Editor** (a `Sheet` on the right):
  - Schedule: target agent (`Combobox`), message, days and time. A typed phrase such as "every weekday 9am" fills these fields, and a preview shows the next 3 runs.
  - Webhook: source preset (Custom, GitHub, Linear, Telegram), a URL with a copy button, the secret (regenerate, masked), a JSON schema (reuse `triggers/JsonEditor.tsx`) and a sample payload with a Test button.
  - Shared by both: **quiet hours** (no runs inside a time window) and **guardrails** (maximum runs per day, maximum tokens per run, dry-run).
- **History:** a `Table` from the trigger ledger with a status `Badge`. Where a decision is pending, Approve and Deny buttons show inline.

**Data (existing code)**
- Schedules: config through `config:get` and `config:update`; the scheduler lives at `src/main/index.ts:701`. Reuse `components/triggers/SchedulesSection.tsx` and `shared/weeklySchedule.ts`.
- Webhooks: `webhooks:list`, `webhooks:save`, `webhooks:delete`, `webhooks:status`, `webhooks:generateSecret` and `webhook:start`/`webhook:stop` (`main/webhook.ts`).
- Context trigger: `triggers:getContext` and `triggers:setContext`.
- History: `triggerHistory:list`, `triggerHistory:decide` and `triggerHistory:clear` (`main/triggerHistory.ts`).
- **New, small:** quiet-hours and guardrail fields on schedules and webhooks, checked in the scheduler and in the webhook handler before a run is sent.

**ui/ components:** Table, Tabs, Sheet, Input, Select, Combobox, Badge, Button, IconButton, Tooltip, Toast, EmptyState, Skeleton, Kbd.

**Keys:** `n` new schedule, `Shift+N` new webhook, `Space` toggles the selected automation on or off, `h` opens History, `t` sends a test from the editor.

**Acceptance**
1. A schedule created here fires at the set time, and the run appears in History.
2. A schedule never fires inside its quiet hours. The skipped run is logged as `skipped:quiet`.
3. A webhook test using the sample payload returns 200 and appears in History. A payload that fails the schema is rejected with 400 and logged.
4. Turning an automation off takes effect without restarting the app.
5. A secret is never shown in plain text unless the user presses Reveal.
6. The screen works in all three languages and in dark mode, with keyboard only.
