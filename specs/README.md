# Screen specs (Vajra's Office)

Every spec here follows these rules:
- Screens live in `src/renderer/src/paper/screens/<route>/`, built the same way as `screens/inbox/`: `screen.tsx`, `model.ts`, `copy.ts` and one CSS file.
- Register each screen in `screens/index.ts`. The route ids already exist in `paper/routes.ts`.
- Components come only from `src/renderer/src/ui` (abbreviated `ui/`).
- Every visible string is an i18n key. Translations: English, Chinese, Arabic (right-to-left).
- Each screen has four states: **empty**, **loading** (`Skeleton`), **error** (inline `EmptyState` with a Retry button; never a modal) and **ready**.
- Every action is also registered in `paper/actions.ts`, so the ⌘K command palette can run it.
- Keyboard rules shared by all screens:
  - `j`/`k` move through a list, `Enter` opens the selected item, `Esc` closes a sheet.
  - `/` focuses search, `n` creates a new item.
  - Shortcuts never fire while the focus is in a text field.
- The classic UI keeps working the whole time (`paper/classicFlag.ts`). The main-process IPC handlers stay as they are; we reuse them, and any new handler is listed under its spec.
