# Tile artwork disappearing on hover

## Source finding and verification boundary

The v0.1.15 Tile adapter inherited CCM's entire `prepare()`/`sync()` policy. Consequently:

- Every ordinary Tile `layer` read returned the proxy while Tokens were active; `layer.active` reported true even inside native Tile render methods. The actual `canvas.tiles.active` remained false.
- Preview objects were explicitly excluded from that view. Original Tiles and their previews could therefore observe different active-layer states during the same rendering lifecycle.
- `_refreshState()` was wrapped, refreshState flags were requested on attachment/detachment, and `layer.objects.visible` was forced true and later restored from a snapshot.
- The Tile subclass additionally changed the layer z-index and sorted its parent on reconciliation/restoration.

The concrete integration defect is leaking an interaction-only activation fiction into native Tile rendering, coupled with replaying visibility/depth state the renderer owns. Native Tiles have mesh, preview, shape-control and visibility lifecycles which cannot safely be assumed equivalent to CCM Cards.

The official [V14 Tile API](https://foundryvtt.com/api/v14/classes/foundry.canvas.placeables.Tile.html) exposes separate `_refreshState`, `_refreshVisibility`, `mesh`, controls and preview state. It does not publish the complete build-365 implementation. No running Foundry 14.365 instance or licensed core source was available here. The exact native branch hiding the user's particular tile has **not** been reproduced or conclusively identified. The regression below models the integration's conflicting layer views; it is not evidence that a specific proprietary renderer assignment caused the observed symptom.

## Change

`TileInteraction` retains shared lifecycle attachment/cleanup but overrides preparation and reconciliation. It scopes the layer proxy to synchronous `isInteractable` and native `_can…` permission checks only; `try/finally` restores that scope even when a predicate throws. Predicates themselves still enforce native permissions, locks and visibility.

Native `_onHoverIn`, `_onHoverOut`, `_refreshState`, `_refreshVisibility`, control, drag, clone and configuration handlers are not replaced. Outside a permission check, `tile.layer` is the genuine layer, including during hover and preview rendering. No renderFlags are requested. The Tile adapter never writes mesh properties, `visible`, `renderable`, `alpha` or `zIndex`, and never sorts containers. Native hit areas are retained.

`drawTile` and `refreshTile` hooks reconcile only pointer properties after native processing. Teardown restores permission/accessor descriptors and pointer properties; it does not restore artwork state. CCM's registration and shared implementation remain byte-for-byte unchanged.

This narrows the integration's assumptions, but actual selection, dragging, controls and mouse dispatch still require build-365 runtime verification. If a native Tile interaction path tests layer activation outside the permission gates, identify that path before adding a targeted compatibility adjustment. Do not restore the broad rendering proxy or force artwork visible to mask it.

## Offline regression

The Tile contract fixture covers background, foreground and partially transparent artwork. Its render-sensitive model observes actual versus emulated layer identity across hover/leave, native refresh, preview creation, layer switches and teardown. It asserts native method identity, no forced render flags, unchanged mesh/depth/alpha, and no stale visibility replay. Other tests preserve permission/lock behavior, native hit areas, exception cleanup, creation/redraw and independent CCM/Tile teardown. Existing CCM tests run unchanged.

These are offline contract tests, not a real Foundry renderer or PIXI pointer-event test.

## Required manual Foundry 14.365 checks

Use a backed-up world with this branch installed and reload clients so v0.1.15's old instance patches are removed. Start on Tokens with both integrations enabled. For a background Tile, foreground Tile and transparent Tile:

1. Hover repeatedly and leave. No artwork should disappear, flicker, change depth or remain hidden.
2. Select/deselect and drag; confirm only the intended position changes.
3. Double-click configuration and right-click native controls. Check locks and permissions; hidden/occluded artwork must retain native behavior.
4. Move a Survivor and Monster; draw and drag a CCM Card, including an Allocate Card region drop. Include overlapping tokens/cards and a large background Tile.
5. Switch Tokens → Tiles → Tokens; repeat hover and controls.
6. Redraw/reload the canvas and switch scenes; repeat.
7. Toggle Tile integration off/on, then CCM off/on independently. Repeat hover, controls and token/card movement.

Record the results and console errors before claiming runtime resolution. No release/version bump is included in this fix PR.
