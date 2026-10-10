# MDF-18 Memory browser

**User goal:** find what the office knows by meaning, and see how agents and topics connect.

**Screens and states**
- **Header:** a search `Input` that searches by meaning, filter chips for agent and source (memory or knowledge), and a view switch for Cards, List and Graph.
- **Cards:** each card shows a snippet, the agent `Avatar`, the source file and how long ago it was written. Clicking a card opens a `Sheet` with the full text and an Open file button.
- **List:** the same results in a dense `Table`.
- **Graph:** WebGL force layout. Agent nodes and topic nodes are coloured by cluster; hovering shows a `HoverCard`; clicking a node filters the results. If WebGL fails, fall back to the existing SVG graph (`components/memoryGraph/*`).
- **Knowledge tab:** ingested documents, an Add files button and a Remove button for each document.
- **States:**
  - Empty, before any search: recent memories plus a "Memory is building" status.
  - No results: suggested queries.
  - Loading: skeleton cards.
  - Error: shown when MemPalace is unavailable (reported by `hive:memoryStatus`), with a Retry button.
- **Footer:** palace status and a Reflect now button.

**Data (existing code)**
- Memory: `hive:searchMemory`, `hive:memory`, `hive:memoryStatus`, `hive:memoryWakeUp` and `memory:reflectNow` (`main/memory.ts`, `main/reflect.ts`).
- Knowledge: `kg:status`, `kg:list`, `kg:search`, `kg:get`, `kg:remove`, `kg:ingestFiles` and `kg:addFiles` (`main/knowledge.ts`).
- Graph topics: `components/memoryGraph/*` and `MEMORY_GRAPH_SPEC.md`.
- Agent memory files: `hive/agents/<id>/memory.md`.

**ui/ components:** Input, Tabs, Card, Table, Avatar, Badge, HoverCard, Sheet, Button, EmptyState, Skeleton, Toast.

**Keys:** `/` focuses search, `1`/`2`/`3` switch between Cards, List and Graph, `j`/`k` plus `Enter` open a result, `r` runs Reflect now.

**Acceptance**
1. A search by meaning returns results in under 1.5 s on a hive with 10 agents. The query is debounced by 250 ms.
2. All three views show the same result set for the same query.
3. The graph renders 500 nodes at 50 frames per second or more, and the SVG fallback works when WebGL is unavailable.
4. Adding a document to Knowledge makes it searchable without a restart.
5. Graph colour is never the only clue: a text label or legend always goes with it. The screen is usable with a screen reader.
