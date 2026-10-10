# MDF-19 Capabilities

**User goal:** give each agent the right skills and MCP servers (Model Context Protocol tool servers) in one place, and see who has what.

**Screens and states**
- **Marketplace tab:** a grid of skill and MCP `Card`s. Search box, filter by type and risk tier, and an Install or Enable button on each card.
  - Empty: the remote catalog is offline. Show the installed items and a banner.
- **Installed tab:** a `Table` with columns Name · Type · Source (Claude/OpenCode/Codex) · Used by · Actions (Reveal, Uninstall).
- **Who has what tab:** a matrix with agents as rows and capabilities as columns, and a checkbox in each cell. The header row has a "Give to all" action.
  - Changes are queued until the user presses Apply. A diff `Dialog` lists them, and agents that need a restart are flagged.
- **Role bundles:** a `Select` of preset bundles (Developer, Researcher, Tester, Writer) and a "Save current selection as bundle" action. Applying a bundle to an agent fills its row in the matrix.
- **States:** Loading shows skeleton cards. Error is tracked separately per tab, so one failing tab does not block the others.

**Data (existing code)**
- Skills: `skills:catalog`, `skills:local`, `skills:install`, `skills:uninstall` and `skills:reveal` (`main/skills.ts`).
- MCP: `shared/mcpCatalog.ts`, plus `config.mcpDefaults` through `config:get` and `config:update`. The per-agent MCP and capabilities choice is the same one `AddAgentModal` and `EditAgentModal` make.
- Agents: `roster:read` and `roster:write`.
- **New:** bundles stored as `config.capabilityBundles[]` (name, skills[], mcp[]), plus a per-agent apply that writes the agent's skill and MCP settings and asks before restarting it.

**ui/ components:** Tabs, Card, Table, Input, Select, Combobox, Badge (risk tier), Dialog, Button, Tooltip, EmptyState, Skeleton, Toast.

**Keys:** `/` focuses search, `1`/`2`/`3` switch tabs, arrow keys plus `Space` toggle a matrix cell, `⌘Enter` applies.

**Acceptance**
1. A skill installed from the Marketplace shows up under Installed and is visible to the agent after its restart.
2. Changes in the matrix take effect only after Apply. The diff lists every change, and Cancel throws them all away.
3. Applying a bundle to 3 agents gives each of them exactly the bundle's set.
4. MCP servers in a risky tier need explicit confirmation and are never turned on by default (keep the `mcpCatalog` tier rule).
5. The matrix scrolls with 30 agents × 60 capabilities and its header stays visible.
