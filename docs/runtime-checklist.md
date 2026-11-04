# Foundry 14.365 / Forge runtime acceptance

Status: **NOT RUN**. No Foundry installation, license runtime, or authenticated Forge world was supplied to this development environment. Offline stubs do not replace runtime testing.

Record date, Foundry exact version, Forge game, browser, commit, tester, errors and reproduction steps when run. Do not include private game data in public issues.

- [ ] ZIP import with Bazaar substitution disabled; clean world creation
- [ ] No initialization, missing module/template, or browser console errors
- [ ] Every Actor and Item type creates and opens its custom sheet
- [ ] Survivor fields, armor/injury/brain boxes and statuses save/reload
- [ ] Item fields, quantity zero, attack modifiers and affinities save/reload
- [ ] Gear drops make independent owned copies; slot assignments persist
- [ ] Owned gear moves without duplicate assignment; deletion clears slots and legacy missing references can be cleared
- [ ] Settlement counters, party/quarry and phase persist across reload
- [ ] Duplicate party rejected; deleted Actor references can be cleared
- [ ] GM campaign selection persists; player cannot change world selection
- [ ] Observer cannot edit; Owner can edit authorized records
- [ ] Two clients see saved Actor and embedded Item updates
- [ ] Read-only and editable sheets remain usable at 1280×720 viewport
- [ ] Native square-grid Scene/token creation works
- [ ] Native Cards directory works; reserved UUID fields persist
- [ ] Reload in each phase preserves shared state

After passing: record the exact commit/release, Foundry build, Forge game configuration, tester and date. The manifest already declares `verified: "14.365"` as requested for installation metadata; its badge is not the runtime test record. Do not mark this checklist complete based on that badge or offline package validation.

- [ ] Complete the latest [Survivor drop-target checks](survivor-drag-drop.md).
