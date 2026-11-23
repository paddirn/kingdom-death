# v0.1.17 — Injury Items and token status indicators

Includes merged PR #18.

- Resource Quantity sits beside Keywords using the square numeric stepper.
- Injury Items reuse the Disorder model and sheet, with an owned Injury list on Survivors.
- Knockdown uses the existing Survivor field and a per-token Monster flag, with a native Token HUD toggle and centered prone indicator.
- Survivor bleeding displays up to five red drops, accepts integers 0–5, and marks Dead atomically when reaching five. Reducing bleeding does not resurrect.
- Optional client-side Tile pointer diagnostics are off by default. CCM is unchanged.

**Known limitation:** simultaneous native Tile interaction remains unresolved. This release retains the existing Tile adapter; it does not deliver or claim a replacement routing fix.

Valid existing bleeding data is preserved. Invalid legacy bleeding is clamped/truncated, with its original value retained in system.legacyBleeding. Invalid values clamped to five mark Dead. Non-numeric legacy values become zero. See [migration details and manual checks](https://github.com/paddirn/kingdom-death/blob/v0.1.17/docs/items-token-status.md).

Validation: 171 JavaScript tests and 9 Python packaging tests, plus syntax, module paths, templates, manifest and ZIP checks. Actual Foundry V14.365 rendering, mouse interactions, HUD behavior and multiplayer acceptance have not been verified. Target remains 14.365.

Back up the world, stop the game, update the system in Forge, restart and fully reload all clients. Test Resource/Injury editing, linked and unlinked Survivor status, per-token Monster knockdown, bleeding/death/Settlement refresh, and existing Armor, movement and CCM behavior before using a live campaign.
