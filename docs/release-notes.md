# v0.1.18 — Tile interaction gates and Resource header layout

Includes merged PR #19.

- Addresses two observed Tile interaction blockers in Foundry 14.365: the hidden interaction objects container and native control() rejecting the inactive layer before permission checks.
- Exposes the interaction container during Token-layer use, with restoration on disable and native layer transitions. Tile artwork remains in its native rendering lifecycle. No layer switching, extra render requests, depth changes, or CCM changes.
- Keeps native hover and rendering on the genuine layer state, including synchronous callbacks during selection.
- Resource sheets show Name, Keywords and Quantity in three columns. Quantity uses a 52px square with minus/plus buttons below, matching Survivor armor. Very narrow windows wrap Name above the other two controls.

Validation: 173 JavaScript tests and 9 Python packaging tests pass, plus syntax, module paths, templates, manifest and ZIP validation. New tests reproduce the hidden interaction container and native control gate, and cover render isolation, exception cleanup and restoration.

**Runtime acceptance is still pending.** This is a targeted fix based on the user's installed build 365 source and diagnostics, not a claim of verified native mouse behavior. Test Tile selection, dragging, double-click, right-click and hover alongside tokens and CCM. Empty-canvas drag-box selection remains Token-only. Resource visual alignment also requires runtime confirmation.

No schema/data migration is introduced in this patch. Foundry target remains 14.365.

Back up your world, stop the Forge game, update the system, restart, and fully reload every client to remove the previous instance patches. See [diagnostic evidence and manual checks](https://github.com/paddirn/kingdom-death/blob/v0.1.18/docs/items-token-status.md). If Tile interaction still fails, enable Debug Tile Pointer Routing and capture the output.
