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

## Follow-up: build 365 diagnostic evidence

The user's v0.1.17 runtime snapshot showed 25 Tiles beneath an invisible
`canvas.tiles.objects` container, with 24 unlocked Tiles reporting interactable.
Their artwork meshes belong to PrimaryCanvasGroup. Installed build 365 source
also showed that native control() rejects inactive layers before checking
permissions. The previous tests missed both the hidden ancestor and the
additional control() gate.

The follow-up adapter exposes only the interaction objects container during
Token-layer lifecycle synchronization and restores it before native layer
transitions or on disable. It does not change Tile or mesh visibility, alpha,
depth, locking, hit areas, documents, or the global active layer. This revises
the earlier blanket ban on container visibility changes based on the observed
separation between interaction objects and artwork.

Native control() now gets the same synchronous layer-active view as permission
checks; its native permission checks still run. Native hover, _onControl,
_refreshState and _refreshVisibility execute with the genuine layer even if
invoked synchronously during control. These wrappers do not request extra
refreshes or replace render logic. CCM/shared cross-layer code is unchanged.

173 Node tests and 9 Python tests pass, including hidden-container routing,
control gates, reentrant rendering, exception cleanup and layer-transition
restoration. These are contract tests, not a licensed Foundry runtime.

This is a targeted candidate fix for the two observed blockers. Selection,
dragging, configuration, right-click, resizing, hover artwork and CCM allocation
still require the manual build 365 checklist above. Empty-canvas drag selection
continues to be owned by the Token layer; this patch does not add a second box
selection workflow. Published in v0.1.18 following the merge of PR #19; runtime acceptance remains pending.

### Resource header follow-up

Resource Name, Keywords and Quantity are now three direct header columns.
Quantity uses the same 52px square and two 26px buttons below as Survivor armor.
The earlier generic square marker did not apply because its CSS was scoped to
Survivor sheets, and nesting Keywords/Quantity caused wrapping inside one column.
At very narrow content widths (335px or less), Name spans the first row while
Keywords and Quantity stay together below. Other Item headers are unchanged.
The existing quantity binding, permissions and shared numeric event handling
remain intact. Actual Foundry visual verification is pending.
