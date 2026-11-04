# Foundry 14.365 / Forge runtime acceptance

Status: **NOT RUN**. No Foundry installation, license runtime, or authenticated Forge world was supplied to this development environment. Offline stubs do not replace runtime testing.

Record date, Foundry exact version, Forge game, browser, commit, tester, errors and reproduction steps when run. Do not include private game data in public issues.

- [ ] ZIP import with Bazaar substitution disabled; clean world creation
- [ ] No initialization, missing module/template, or browser console errors
- [ ] Every Actor and Item type creates and opens its custom sheet
- [ ] Survivor fields, armor/injury/brain boxes and statuses save/reload
- [ ] Item fields, quantity zero, attack modifiers and affinities save/reload
- [ ] Gear drops make independent owned copies; slot assignments persist
- [ ] Duplicate assignment rejected; deletion/stale reference can be repaired
- [ ] Settlement counters, party/quarry and phase persist across reload
- [ ] Duplicate party rejected; deleted Actor references can be cleared
- [ ] GM campaign selection persists; player cannot change world selection
- [ ] Observer cannot edit; Owner can edit authorized records
- [ ] Two clients see saved Actor and embedded Item updates
- [ ] Read-only and editable sheets remain usable at 1280×720 viewport
- [ ] Native square-grid Scene/token creation works
- [ ] Native Cards directory works; reserved UUID fields persist
- [ ] Reload in each phase preserves shared state

After passing: record evidence and set `compatibility.verified` to `14.365` in a reviewed change; update manifest validation accordingly. Until then the package is an unverified foundation candidate.
