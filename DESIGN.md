# Vajra — Design System (“Paper” v1)

> A calm, dense, keyboard-first workspace in the class of Linear, Raycast and Arc. The office metaphor stays as an optional, polished view. Pixel art is gone from chrome: no Press Start 2P, no SNES borders, no hard 4px shadows.
>
> **This document is canonical for new UI.** Every new component derives from these tokens. The previous pixel system is archived at [`docs/DESIGN.classic.md`](./docs/DESIGN.classic.md) and still drives the office floor until the classic-UI flag (MDF-8) is off.

Token source: [`src/renderer/src/design/paper/tokens.ts`](./src/renderer/src/design/paper/tokens.ts)  
Generated CSS: [`src/renderer/src/design/paper/tokens.css`](./src/renderer/src/design/paper/tokens.css)  
Visual board: [`docs/paper-preview.html`](./docs/paper-preview.html)

Prefix is `--paper-*`. Classic tokens stay `--cth-*`. Do not mix them on one element.

---

## 1. Principles

1. **Information density with air.** Compact by default; padding comes from the 4px grid, never from decoration.
2. **Keyboard first.** Every action is in the ⌘K palette. Visible focus rings. j/k triage on lists.
3. **One colour language.** Status, accent and danger mean the same on an avatar ring, a row, a badge and a toast.
4. **Quiet motion.** 120 / 200 / 320 ms, `cubic-bezier(0.2, 0, 0, 1)`. Honour `prefers-reduced-motion`.
5. **Paper, not plastic.** Warm surfaces, cool ink, no glassmorphism, no gradients on chrome.
6. **Accessible by construction.** WCAG 2.2 AA, RTL and CJK fallbacks, minimum window 1024×640.

### What we are not
Not Animal Crossing. Not SNES menus. Not iOS glass. Not a retro filter on a web app. The floor may stay playful; the shell is a tool.

---

## 2. Colour (OKLCH)

All colour is OKLCH. Equal numeric steps are meant to look equally different. Each scale has **12 steps** (Radix convention):

| Steps | Role |
|---|---|
| 1–2 | App / subtle background |
| 3–5 | Component background, hover, pressed |
| 6–8 | Borders |
| 9–10 | Solid fills |
| 11–12 | Muted text / primary text |

Scales: `neutral` `accent` `success` `warning` `danger` `info`.

Themes, stamped as `data-paper-theme` on `<html>`:

| Theme | Use |
|---|---|
| `light` | Default. Warm paper (hue 85) and cool ink (hue 270). Accent indigo (hue 264). |
| `dark` | Lifted off black (L ≈ 0.17), warm dust, no #000 / #fff glare. |
| `hc` | High-contrast light. Near-zero chroma on neutrals, thicker focus ring, 7:1 body text. |

Semantic aliases (do not invent new ones):

```
--paper-bg            → neutral-1
--paper-bg-subtle     → neutral-2
--paper-surface       → neutral-2
--paper-surface-hover → neutral-3
--paper-border        → neutral-6
--paper-border-strong → neutral-7
--paper-text          → neutral-12
--paper-text-muted    → neutral-11
```

### 2.1 Status colour language

One mapping, used on avatars (MDF-10), agent rows, the palette and toasts.

| Token | Means | Scale |
|---|---|---|
| `--paper-status-idle` | At rest | neutral-8 |
| `--paper-status-thinking` | Reasoning | info-9 |
| `--paper-status-working` | Tool in flight | warning-9 |
| `--paper-status-waiting` | Blocked on another agent | accent-9 |
| `--paper-status-blocked` | Needs the human | danger-9 |
| `--paper-status-success` | Just finished | success-9 |
| `--paper-status-ghost` | Archived / fading | neutral-6 |
| `--paper-status-compacting` | Boxing context | accent-8 |
| `--paper-status-looping` | Circuit breaker armed | warning-10 |
| `--paper-status-typing` | Unsent text holding the queue | warning-8 |

### 2.2 Contrast floors (light, verified intent)

- Body text (`neutral-12` on `neutral-1`) ≥ 7:1 in `hc`, ≥ 4.5:1 in `light`/`dark`.
- Secondary text (`neutral-11`) ≥ 4.5:1.
- Borders that define controls (`neutral-6`/`7`) ≥ 3:1 against the surface they sit on.
- Text on solid accent-9 uses `neutral-1` of the same theme, never raw white.

No gradients on chrome. No colour as the only indicator (pair with a label or icon).

---

## 3. Typography

Two families. Inter for the interface (tabular nums via `"tnum"`). JetBrains Mono for code and terminals. Press Start 2P, Pixelify Sans and VT323 are **not** used in Paper chrome.

| Role | Family | Fallback |
|---|---|---|
| UI | Inter / Inter Variable | system-ui, PingFang SC, Noto Sans SC, Noto Naskh Arabic |
| Mono | JetBrains Mono | ui-monospace, SF Mono, Noto Sans Mono CJK SC |

### Scale

| Token | Size | Line | Use |
|---|---|---|---|
| `xs` | 12 | 16 | Meta, timestamps, kbd |
| `sm` | 13 | 18 | Secondary UI, sidebar |
| `md` | 14 | 20 | Default body |
| `lg` | 16 | 24 | Section titles, composer |
| `xl` | 20 | 28 | Screen titles |
| `display` | 28 | 36 | Empty states, onboarding |

Weights: 400 regular, 500 medium, 600 semibold. No 700 on chrome. Emphasis is weight or colour, not italics (except prose).

Sentence case. Status labels lowercase (`working`, `blocked`). Tabular numbers on cost, tokens, clocks.

---

## 4. Space, radius, elevation, motion

**Space** is a 4px base: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--paper-space-0` … `--paper-space-10`).

**Radius:** 6 sm (chips, kbd) · 8 md (buttons, inputs) · 12 lg (cards, menus) · 16 xl (dialogs, sheets) · full (avatars, pills).

**Elevation** (three levels):

| Level | Light | Dark | HC |
|---|---|---|---|
| 1 | hairline shadow | faint | 1px ink ring |
| 2 | menus, popovers | menus | 2px ink ring |
| 3 | dialogs, command palette | dialogs | 3px ink ring |

High contrast uses rings instead of blur so structure survives Windows HC and print-like themes.

**Motion:** 120 fast (hover) · 200 base (panels) · 320 slow (page). Easing `cubic-bezier(0.2, 0, 0, 1)`. Under `prefers-reduced-motion`, all three durations collapse to `0.01ms`.

**Focus:** `--paper-focus-ring` is a double ring (surface + accent). Never `outline: none` without replacing it. The command-palette search field is the exception: it keeps `outline: none` and shows focus with its accent bottom border.

---

## 5. Layout (app shell)

```
┌ Title bar: workspace · ⌘K · status (agents, $ today) · voice · account ┐
├ Sidebar (resizable, collapsible) ─┬ Main ────────────────┬ Inspector ─┤
│ Inbox (badge)                     │ routed screen        │ selection  │
│ Tasks · Automations · Memory      │                      │            │
│ Capabilities · Temps · Stapler    │                      │            │
│ ── Agents (project groups)        │                      │            │
│ ── Notes                          │                      │            │
└───────────────────────────────────┴──────────────────────┴────────────┘
```

- Minimum window: 1024×640.
- Sidebar: 240–360px, collapsible to icon rail (64px).
- Inspector: optional, 280–360px.
- Density: compact default; a comfortable density token may land later (`--paper-density`).

Classic UI remains behind a flag (MDF-8). Paper chrome does not load `--cth-*` panel borders.

---

## 6. Components (library lives in `src/renderer/src/ui/`, MDF-7)

Radix primitives, Paper styling, Lucide icons. No inline styles in new code. CSS Modules or a colocated `.module.css` on the tokens.

Button, IconButton, Input, Select, Combobox, Tabs, Dialog, Sheet, Popover, Tooltip, Menu, Toast, Badge, Avatar, Card, Table, EmptyState, Skeleton, Kbd, Splitter.

Toasts are only for an action the user just took. Everything else goes to the notification centre.

---

## 7. Agent identity (MDF-10)

Each agent gets a generated vector avatar: initials or a glyph on its accent, plus a status ring that uses the language in §2.1. Rings animate for thinking / working / waiting / blocked / looping; they freeze under reduced motion.

---

## 8. Quality gates

- WCAG 2.2 AA contrast on every text/control pair.
- Full keyboard access; focus visible; skip to content.
- RTL: logical properties (`margin-inline`, `inset-inline-start`), not `left`/`right`.
- CJK and Arabic fall through the font stacks above.
- i18n key for every new string.
- No Press Start 2P / Pixelify / VT323 in Paper surfaces.
- LimeZu pixel tilesets stay attributed (`LICENSE-ASSETS`) for as long as the office view uses them.

---

## 9. How to regenerate CSS

```bash
cd munder-difflin   # or the UI worktree
node --experimental-strip-types -e "
import { emitPaperCss } from './src/renderer/src/design/paper/tokens.ts';
import { writeFileSync } from 'node:fs';
writeFileSync('./src/renderer/src/design/paper/tokens.css', emitPaperCss());
"
```

Edit `tokens.ts` only. Commit the generated `tokens.css` with it.

---

## 10. Classic floor

The Pixi office, `--cth-*` tokens, and `src/renderer/src/design/tokens.ts` remain for the optional floor. Do not delete them in this phase. New screens import `@/design/paper`.
