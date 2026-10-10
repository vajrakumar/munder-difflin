# MDF-21 Settings and onboarding

## Settings
**User goal:** find any setting in a few seconds and change it safely.

- Settings is a full screen: a left nav plus a content area. It replaces the `SettingsModal` sections without changing them: General, Prerequisites, Agents & Models, Autonomy & Budgets, Connections (MDF-20), Voice, Memory & Knowledge. Add Appearance, which holds theme (light, dark or high contrast), density, accent colour and the Office view toggle.
- **Search** across every setting label and its help text. A result jumps to the setting and highlights it.
- **One Save bar** appears once anything changes. It shows the number of changes and a "Review" `Dialog` listing each change as old value → new value, with Save and Discard buttons. Leaving the screen with unsaved changes asks for confirmation.
- **States:**
  - Loading: skeleton.
  - Error on save: a field-level message plus a `Toast`. Nothing is half-saved.
- **Data:** `config:get` and `config:update`; `providerKey:set`, `providerKey:has` and `providerKey:clear`; `config:setAgentTokenCap`; `freeflow:setConfig`; `slack:setConfig`; `config:changeHome`. Prerequisites reuse `SetupPanel.tsx` and `shared/toolCatalog.ts`.
- **Keys:** `⌘,` opens Settings, `/` searches, `⌘S` saves, `Esc` discards after a confirmation.

## Onboarding
**User goal:** reach a working office in under 2 minutes.

- **Three steps**, replacing the 7 steps in `OnboardingWizard.tsx`:
  1. **Engines.** Engines are detected automatically with install cards for missing ones (`main/cliInstall.ts`, `shared/engineAvailability.ts`). Pick the orchestrator engine.
  2. **Workspace.** Pick the hive folder and the repos (current steps home and repos). Permissions and reliability go in an "Advanced" disclosure.
  3. **Meet your office.** Name it (default "Vajra's Office"), start the orchestrator, and offer an optional sample task.
- A progress indicator; Back always works; the state survives closing the window.
- **Error:** an engine failed to install. Show the log tail and its install command, and offer Skip with a warning.

## Acceptance
1. Typing "budget" in Settings search finds the token cap fields.
2. No change is written until Save. Discard brings every field back to its saved value.
3. Every current setting can be reached; a check compares the old and new section lists.
4. A new user who already has Claude Code installed reaches a running orchestrator in 3 screens and under 2 minutes.
5. Both screens work with keyboard only, in all three languages, and in all three themes.
