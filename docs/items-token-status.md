# Items and token status (v0.1.17)

Resource Quantity shares a row with Keywords and uses the common square numeric
stepper. Injury is an additional BasicItemData subtype, using the same sheet as
Disorder. Survivors list owned Injury Items below Armor & Injuries; these are
manual records, independent of Severe Injuries and Disorders.

## Persistent state and migration

- Survivor knockdown remains `system.knockedDown` on the associated Actor.
- Survivor bleeding remains `system.bleeding`, integer 0–5.
- Monster knockdown is per TokenDocument: `flags.kingdom-death.knockedDown`.
- No token texture, rotation, dimensions, native status effects, or deck data change.
- Legacy out-of-range/fractional bleeding is clamped/truncated on model migration,
  with the original value retained in `system.legacyBleeding` (blank by default).
  Non-numeric legacy values become zero. Valid 0–5 records are unchanged.
  Invalid legacy values clamped to five are marked Dead.
  Migration is idempotent and is persisted when the Actor is next saved.

Normal Actor updates reject invalid bleeding, rather than silently clamping it.
An update reaching five includes Dead in the same transaction. Creating a
Survivor at five also marks it Dead. Reducing bleeding never resurrects. An
explicit Dead edit remains possible when bleeding is already five.

The HUD writes to `token.actor` for Survivors, including synthetic Actors; it
does not resolve a synthetic Actor back to its World Actor. Linked tokens
therefore share state; unlinked ones remain independent. The existing
updateActor refresh hook updates open Settlement population sheets. Population
lists continue to represent World Actors, not scene-specific synthetic Actors.

The overlay uses a noninteractive token child, a configured native prone icon
(`CONFIG.statusEffects`, falling.svg fallback), and original red drop geometry.
There is no prone artwork bundled with the system. A state/geometry signature
prevents repainting during unchanged refreshes; async texture loads are checked
against the current entry. Native token status graphics are not replaced.

## Tile investigation — unresolved, not a delivered fix

The existing permission-gated proxy has **not** been replaced in this branch.
CCM and shared cross-layer logic are unchanged. The previous offline test doubles
call Tile methods directly and have visible parent containers. They do not
reproduce native PIXI hit testing or Foundry's inactive-layer lifecycle and
cannot establish that Tile interactions work.

Potential event-routing failure: eventMode and interactiveChildren cannot make
a child receive events through a hidden/noninteractive ancestor. Further native
control/drag activation checks may also reject callbacks. Neither is confirmed
as the runtime cause without the affected V14.365 scene/core implementation.

The public V14 MouseInteractionManager.handleEvent API explicitly excludes drag
events. Forwarding mouse events to that method alone is therefore not a complete
replacement. Rebinding its target or creating an independent interaction surface
requires inspecting the installed manager and Tile handler implementations,
including drag ownership, cancellation, control state and preview cleanup.
No speculative replacement movement logic, layer activation, artwork visibility
changes or hotkeys have been introduced.

Enable client setting **Debug Tile Pointer Routing** to log mouse-down targets,
Tile manager states, and ancestor visible/renderable/eventMode/interactiveChildren
values. It is off by default, observes without intercepting events, and removes
its listener on scene teardown or reattachment. Attach this output from a failing
scene when continuing the Tile fix.

References:
- https://foundryvtt.com/api/v14/classes/foundry.canvas.interaction.MouseInteractionManager.html
- https://foundryvtt.com/api/v14/classes/foundry.canvas.placeables.Tile.html
- https://foundryvtt.com/api/v14/classes/foundry.canvas.layers.TilesLayer.html
- https://foundryvtt.com/api/v14/functions/foundry.canvas.loadTexture.html

These rolling V14 docs are not a substitute for build 365 source or runtime.

## Manual acceptance checklist — pending Foundry 14.365

Use a backed-up test world on Forge before updating a live campaign.

1. Create Resource and Injury world Items; edit keywords, quantity zero and
   positive values, description/source/image. Save, reopen and reload.
2. Add/drop Injury onto a Survivor, edit/open/remove it; verify Disorder and
   Severe Injury records stay unchanged. Repeat as owner and observer.
3. Place linked and unlinked Survivors plus two tokens of one Monster. Toggle
   Knocked Down in the HUD and Survivor sheet. Verify linked sharing, unlinked
   isolation, Monster token independence and a centered half-size icon.
4. Test 1×1, 2×2 and rectangular tokens. Move/target tokens; confirm status
   graphics do not intercept input and native status effects coexist.
5. Set bleeding from 0 through 5 through sheet and macros. Confirm five drops,
   atomic Dead, and open Settlement living/dead list and death-count updates for
   World Actors. Reduce to three: Dead stays set. Explicitly clear Dead.
6. Reject negative, fractional and >5 values. Repeat with a synthetic Actor and
   confirm the World Actor and Settlement World population remain unchanged.
7. Reload, switch scenes, delete/recreate tokens and repeat with two connected
   clients and a non-owner. Confirm no duplicate or stale overlays.
8. Enable Tile diagnostics, start on Token layer, select/drag/configure Tiles,
   move Survivor/Monster tokens, draw/drag CCM cards into Allocate Card regions.
   Test foreground/background/transparent/locked/hidden Tiles, scene changes and
   setting toggles. Capture failures; do not mark the Tile requirement accepted
   from the offline tests.
9. Check Armor accounting, attack macros, movement overlay and native token
   effects alongside these indicators.

Offline tests cover schema contracts, atomic Actor updates, migrations, Item
rendering, overlay lifecycle and permission routing with doubles. Actual Foundry
rendering, mouse interactions, multiplayer synchronization and HUD appearance
have not been runtime verified. PR #18 was merged and v0.1.17 publication was authorized with the Tile
replacement explicitly unresolved. Publication does not establish runtime acceptance.
