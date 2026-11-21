# Tile interaction and Monster movement range

Target: Foundry V14 build 365. No system version bump or release is part of this change. Actual Foundry/Forge mouse interaction and rendered appearance have not been tested in this environment.

## Tiles alongside Tokens and CCM

**Enable Tile Interaction on Token Layer** is a client checkbox, enabled by default. It is independent of **Enable CCM Interaction on Token Layer**, and does not require CCM.

The shared `scripts/integrations/cross-layer.mjs` extracts the existing CCM layer-view adapter. The CCM wrapper retains its settings, native handlers and card workflows. `tiles.mjs` applies the same instance-scoped bridge to `canvas.tiles`. Only a placeable's view of its layer reports interaction-active; the real active canvas layer is unchanged. Permission predicates, lock handling, frame/handle hit areas, transparency behavior, drag, configuration, HUD and resize handlers remain native. There are no synthetic pointer events, hotkeys or temporary activations.

A single instance lifecycle wrapper dispatches to subscribers. Removing either integration leaves the other subscribed, regardless of enable/disable order. This is necessary because both integrations observe Token activation/deactivation/draw. Canvas teardown restores descriptors and display properties; new placeables and render-state refreshes receive the same bridge.

Tile interaction controls are sorted beneath Token and CCM controls when they share a parent. The actual artwork/meshes, token bounds and card hit areas are unchanged. Passive containers cannot become empty-canvas targets. A tile itself remains clickable in unobstructed space, including a large background tile; overlapping native token/card targets take priority. The original tile-control z-index returns when leaving Tokens or disabling the integration. If another module reparents layers or changes their hit areas, interaction order requires testing with that module.

## Monster range

Right-click a visible Monster token and click the walking-person button, **Show Movement Range**. The active button is tinted and exposes `aria-pressed`. Clicking again clears the range. **Toggle Monster Movement Range** is configurable in Foundry's controls; no default key is reserved. The shortcut ignores Survivors and uses the first selected eligible Monster. Both entry points control one local overlay; choosing another Monster replaces the previous one.

**Enable Monster Movement Range** and **Monster Movement Range Opacity** are client settings. Nothing is written to a Scene, Actor, Token, Tile, Drawing or Region. No chat or socket messages are sent by the overlay.

`scripts/rules/monster-movement.mjs` computes breadth-first orthogonal reachability. Destinations are top-left grid anchors. Every destination includes the whole width × height footprint, and every intermediate step must be legal. The visual result is the union of legal footprints; a highlighted square is not necessarily a legal top-left anchor. Movement 0 displays only the current footprint. Scene padding and partial cells at scene edges are excluded.

`scripts/canvas/movement-context.mjs` maps native grid offsets/top-left points and snapshots obstacles. All other tokens at the same elevation block their occupied squares; fractional blocker footprints conservatively block every touched square. Decorative tiles are not obstacles. Native `Token.checkCollision` handles movement-barrier semantics; if available, `Token.constrainMovementPath` additionally checks native path constraints. Full swept-body probes partition at wall endpoints, so a short wall wholly inside a large footprint cannot be missed by center-only ray tests. Transverse probes are conservative around directional walls: test one-way wall layouts before relying on the range there. Custom terrain effects, teleportation and nonstandard module collision implementations are not modeled as KDM rules.

Only square grids, integer grid-aligned footprints and integer Movement 0–99 are supported. Off-grid Monsters, hex/gridless scenes or unavailable native collision testing produce an explanatory message rather than silently showing a misleading circular range. Current token coordinates and dimensions are never changed to make a preview fit.

### Permissions and visibility

Non-GMs need Observer access to the Monster Actor, and the token must be currently visible and not hidden. GM access does not grant players information. Player calculations ignore hidden/unseen tokens so gaps cannot disclose secret token positions; their previews therefore describe known obstacles and cannot guarantee passage past unseen blockers. GM previews include hidden tokens. The current elevation is used for native collisions.

On token-vision scenes, player traversal and highlighting require native current-visibility checks at the center and inset corners of each cell. Explored fog is not treated as current visibility. Player graphics are also inserted immediately below the native visibility group, rather than above fog in the interface group. If that render placement is unavailable, the preview fails closed. Test partial-cell shadows and third-party vision modules in the target world. Ownership/visibility changes clear stale graphics before recalculation.

### Lifecycle and performance

The controller in `scripts/canvas/monster-movement.mjs` owns one non-interactive PIXI Graphics object. Token/Actor/wall/region/scene/user and visibility changes debounce recalculation by 80 ms; no per-frame full-scene scan is installed. Search expansion is bounded by Movement and scene bounds, with occupancy and cell-visibility caching. Changes remove stale graphics immediately. Scene changes, deletion, setting disable and teardown clear the overlay. HUD rerenders replace the old button, preventing duplicate click handlers.

## Manual Foundry 14.365 acceptance

Use a backed-up Forge world with CCM enabled. No runtime acceptance is claimed by the offline tests.

1. Start on Tokens. Select/move a Survivor, click and drag a tile, double-click its config, use its right-click HUD, resize and rotate it. Check locked tiles, hidden tiles, GM/player permissions and transparent regions of tile textures.
2. Place a large tile behind tokens/cards. Repeat token targeting, dragging, HUD and attack macro use, plus card selection, locked-deck draw, drag, flip, rotation and Allocate Card region drop. Ensure foreground objects win their own hit tests. Do not touch layer controls or hold modifiers.
3. Independently disable/re-enable each integration in both orders. Test native Tile/Card controls on their own layers, then return to Tokens. Repeat after redraw, tile creation/deletion/update and scene switches; verify no duplicate operations or stuck controls.
4. For Monsters use 1×1 Movement 3, 2×2 Movement 3, 3×3 Movement 4, 2×3 Movement 3 and Movement 0. Toggle from the HUD and configurable shortcut. Check full footprint coverage and single-overlay behavior with two Monsters.
5. Block passages with tokens and walls, including one-cell corridors, tiny walls between cell centers, open/closed doors, diagonal walls, one-way walls, elevation and scene edges. Verify no diagonal shortcuts or jumping blocked intermediate squares. Check native region movement constraints where supported.
6. Move/resize the Monster; edit Movement on its Actor (including an unlinked token Actor); move/add/delete blockers; edit walls/doors; switch scenes and alter the grid. Confirm immediate stale-overlay removal and refreshed results.
7. Test player Observer/non-Observer permissions, hidden monsters/blockers, current vision/fog, partial-cell shadows and permission revocation. Known-information player previews intentionally cannot account for secret blockers. Confirm no secret Actor data or hidden-token locations are disclosed.
8. Disable movement overlays, delete the active Monster and change scenes. Confirm graphics disappear, no Scene documents are created and token/card/tile mouse interaction is unaffected.

Offline tests cover geometry, blockers, permission guards, controller and HUD contracts, lifecycle cleanup and independent adapter toggles. They do not emulate Foundry's mouse manager, PIXI hit testing, wall backend, vision rendering or native HUD layout.
