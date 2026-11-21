# Unreleased — CCM simultaneous interaction candidate

Replaces the Alt+C temporary-layer adapter with instance-scoped card interaction while Tokens remain active. Keeps CCM handlers, control/preview state, deck drawing and region allocation. No release version or deployment workflow changes.

Runtime acceptance is pending: this candidate must pass the consecutive mouse-only sequence in [ccm-integration.md](ccm-integration.md) on Foundry 14.365 before publication. Offline tests cover adapter delegation, lifecycle restoration, permissions in contract doubles and absence of keybinding registration, not actual canvas behavior.

# v0.1.13 — Optional CCM canvas access

Adds the client setting Enable CCM Interaction on Token Layer. With Complete Card Management active, hold Alt+C from Tokens to temporarily use CCM's native card layer; release to return after the pointer gesture. The shortcut can be rebound in Configure Controls. Without active CCM the integration does nothing.

This is the modifier-key fallback, not simultaneous interaction while Tokens remain active. Card selection, dragging, locked-deck drawing, flipping, rotation, stacking and region allocation remain owned by CCM. No card data, deck contents or core prototypes are changed. Native layer deactivation may release card selection or HUD state.

The adapter guards repeated keys, token drags in progress, manual layer changes and scene changes, and replaces listeners on canvas redraw. See docs/ccm-integration.md for the source audit, limitations and manual Forge checklist.

Validation: 126 JavaScript tests, 9 Python packaging tests, syntax/template/manifest/module checks and ZIP validation. Foundry V14 build 365 runtime is unverified, including locked draws, Allocate Card regions and multiplayer behavior. Update through Forge, restart the game and reload clients before testing.
