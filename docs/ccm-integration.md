# Simultaneous CCM pointer interaction (runtime acceptance pending)

The client setting **Enable CCM Interaction on Token Layer** defaults to true and requires active `complete-card-management`. The previous Alt+C keybinding and temporary layer switching have been removed. No shortcut is registered. No card/deck data is changed on activation.

Published in v0.1.14 at the project owner's request after PR #15 was merged. This is not a runtime-verified Foundry 14.365 integration; the mouse acceptance checklist below remains outstanding. Offline contract tests cannot establish PIXI hit testing or inherited Foundry mouse-manager behavior.

## Why the previous adapter did not meet the requirement

The previous `CCMAccess.begin()` called `canvas.cards.activate()`, and `reset()` called `tokens.activate()`. Only one layer was interactive at a time, and normal layer deactivation could release selection/HUD state. Enabling pointer events alone also does not establish selection, permission predicates, drag previews or control collections.

## Source inspected

CCM upstream **v3.0.3**, commit [`8de0e8cdf4554da8ae1486fbd50dfd6160f11aa7`](https://github.com/MetaMorphic-Digital/complete-card-management/tree/8de0e8cdf4554da8ae1486fbd50dfd6160f11aa7), whose manifest minimum is 14.365. This is the upstream source, not a verified copy of the module installed in the user's Forge world.

- `src/module/canvas/CardLayer.mjs`: `PlaceablesLayer`, `canvas.cards`, native controlled collection and preview container. `_draw()` builds passive image meshes separately from card placeables, sets the scene-wide layer hit area, and draws the objects container. Selection tool activation calls native `activate()`.
- `CardObject.mjs`: native frame interaction bounds; `isVisible` checks hidden state/Observer access; `_refreshState()` uses `this.layer.active` for background display. Selection, hover and mouse-manager permissions are inherited from Foundry. `_onClickLeft2()` opens the native image viewer. `_initializeDragLeft()` uses `layer.controlled`, `layer.preview`, `_canDrag()` and native locked-deck drawing checks; `_onDragLeftDrop()` enters CCM's private commit workflow and `placeCard()`.
- `src/module/apps/CardHud.mjs`: flip, rotate, shuffle, lock and visibility actions. Rotation has native left/right mouse controls. `helpers.mjs::generateUpdates()` reads the real `canvas.cards.controlled` collection.
- `MoveCardBehavior.mjs`: region allocation uses CCM events and initiating-client/active-GM permissions.
- `ControlsLayer.mjs::_onLongPress()` explicitly checks `canvas.activeLayer instanceof CardLayer`. This adapter does not change that check: long-press behavior stays Token-layer behavior. It is not used as a substitute for ordinary clicks or drags.

Official V14 references consulted: [PlaceableObject](https://foundryvtt.com/api/v14/classes/foundry.canvas.placeables.PlaceableObject.html), [PlaceablesLayer](https://foundryvtt.com/api/v14/classes/foundry.canvas.layers.PlaceablesLayer.html), [InteractionLayer](https://foundryvtt.com/api/v14/classes/foundry.canvas.layers.InteractionLayer.html). These document the interfaces but do not expose all build-365 implementation details. No licensed build-365 runtime/core source was available locally.

## Adapter design

`scripts/integrations/ccm.mjs` registers CCM through the shared `cross-layer.mjs` bridge, which modifies only the current CCM layer, its card instances and the current Token layer's lifecycle methods. It does not patch any prototype, replace a native card action or call layer activation methods.

While Tokens are active, each non-preview card receives a scoped `layer` view. Only that view reports `active: true`; `canvas.cards.active` and `canvas.activeLayer` are unchanged. All other properties, control collections, HUD and preview state delegate to the real CCM layer. Accessors and methods run against the real instance, including private-field access. Original permission handlers are retained rather than replaced with unconditional permissions.

The layer and objects containers are passive with interactive children. Individual card event modes are enabled, retaining native hit areas, visibility and permission handling. There are no DOM listeners, synthesized events, overlap rules or empty-canvas targets. Render refreshes reapply card interactivity, and the layer's `createObject()` result is prepared before it is drawn. Previews retain the real layer.

Lifecycle wrappers restore prior display state *before* native activation/deactivation/draw executes, then reconcile afterward. Canvas teardown removes the instance overrides; canvasReady rebuilds them. Repeated attachment removes the old wrappers first. Setting changes restore/rebuild immediately. Destroyed cards are pruned. Without active CCM nothing is patched. Native behavior on other canvas layers is retained.

## Outstanding runtime risks — do not interpret tests as acceptance

The layer view is a narrow compatibility patch, not a documented CCM extension point. Its key assumption is that inherited Foundry card control/hover/drag gates consult the card's `layer` view. A gate which instead directly reads `canvas.activeLayer`, or retains a different layer reference, may still reject inactive-card interaction. The V14 API pages do not establish those method bodies. If the checklist fails, inspect build 365's `PlaceableObject.isInteractable`, `_canControl`, `_canHover`, `_canHUD`, `_canDrag`, `control`, `_createInteractionManager` and MouseInteractionManager permission callbacks to identify the exact failing condition. Do not bypass ownership checks or add layer switching to hide it.

Global keyboard/wheel dispatch still belongs to Tokens; card rotation should be tested through CCM's native mouse HUD controls. Native HUD dismissal, drag preview rendering, locked-deck draws, allocation, stacking and multi-client races remain unverified. No claim is made that full simultaneous interaction has passed acceptance, or that CCM inherently prevents it.

## Required acceptance on Forge, Foundry 14.365

Use a backed-up test world with CCM v3.0.3 and this development branch. Reload every client. Enable the client setting and start with Tokens selected. Without touching layer controls or holding a key:

1. Move a Survivor token.
2. Click a CCM deck and use its normal controls.
3. Draw a card (include a locked deck with an active GM).
4. Drag it into an Allocate Card region; verify exactly one native allocation.
5. Select another card.
6. Inspect it by double-click; open its right-click HUD, flip and rotate it; test native stacking.
7. Move the White Lion token.
8. Draw another card.

After each step confirm `canvas.activeLayer === canvas.tokens` and no duplicate operation or unexpected token movement. Check token targeting, HUD and attack macros. Click empty space and just outside card bounds; no card action should occur.

Repeat after a scene change and canvas redraw. Test hidden/unowned cards, a non-GM owner, no active GM, two clients, disabled integration, and CCM disabled/uninstalled. Test native Card-layer interaction with the setting off and on to detect restoration regressions. Record Foundry/CCM versions, each result and any console stack before claiming runtime compatibility.

The shared bridge now also supports independently enabled Tile interaction. Token lifecycle subscribers are removed independently, so disabling Tiles does not undo CCM hooks (or vice versa). See [canvas-tools.md](canvas-tools.md).
