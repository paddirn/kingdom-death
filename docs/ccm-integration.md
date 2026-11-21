# Optional CCM canvas access

Enable CCM Interaction on Token Layer is a client setting (default true). Without active `complete-card-management` it does nothing. From Tokens, hold **Alt+C** for native CCM controls, complete the gesture, then release to return to Tokens. Rebind in Configure Controls if the browser/OS reserves Alt+C. Keep the shortcut held through double-clicks and HUD actions. Existing CCM modifier meanings still apply; a non-modified key can be assigned if Alt conflicts with the desired native gesture.

This is the requested modifier fallback, **not full simultaneous interaction with the Token layer remaining active**. Tokens take priority normally; CCM cards take priority during the held shortcut. Background clicks while held follow ordinary CCM layer behavior. The adapter performs no custom hit-testing, pointer interception, synthetic events or card operations. Only one native layer is active. Native CCM bounds, visibility, ownership, flipping, rotation, stacking, HUD and region permissions remain authoritative.

## Source audit

Inspected MetaMorphic-Digital/complete-card-management main at `8de0e8cdf4554da8ae1486fbd50dfd6160f11aa7` (manifest minimum 14.365):

- `src/module/canvas/CardLayer.mjs`: PlaceablesLayer named `cards`, exposed as canvas.cards; controllable/rotatable objects, native selection tool and preview container.
- `CardObject.mjs`: PlaceableObject; frame interaction hit area; isVisible and refresh state; inherited selection/pointer manager; `_onClickLeft2` opens ImagePopout; `_canDragLeftStart` checks locked individual cards; `_initializeDragLeft` uses layer.controlled and layer.preview, handles locked deck draws with active GM; `_onDragLeftDrop` commits through the existing private workflow and placeCard API.
- `MoveCardBehavior.mjs`: CCM region entry/exit events use the initiating authorized client or active GM for allocation.
- `ControlsLayer.mjs`: active CardLayer-specific handling and currentMouseManager cancellation.

No documented inactive-placeable interaction API was found. Making inactive placeables interactive would not establish correct active-layer control, previews and mouse-manager behavior. Full simultaneous support is therefore withheld rather than patching prototypes or replacing CCM handlers. Native activate() is the only interaction entry point used by the adapter.

## Lifecycle and limitations

`scripts/integrations/ccm.mjs` is isolated from sheets and card data. Repeated keydown does not activate twice. Releasing the key during a pointer gesture defers restoration until pointerup and the next task, allowing native dispatch first. Token drags already in progress cannot start this mode. Explicit user changes to another layer are preserved. Scene identity guards prevent restoring stale layers. Canvas teardown/redraw, blur and setting changes reset the session; listeners are abortable and replaced, never stacked. Disable the setting to restore normal layer navigation. Native deactivation can release controlled selections; this adapter does not persist or reconstruct selection or an open card HUD. No network requests or additional card mutations are made.

No Foundry V14 build 365 runtime is available here. Offline tests validate state transitions and lifecycle only. Async locked-deck/region workflows, multi-client behavior and visual bounds are **not runtime verified**.

## Forge manual acceptance checklist

On a backed-up test world with V14.365 and current CCM:

1. Without the shortcut, select/move/target Survivor and Monster tokens, right-click token HUDs, drag tokens, and run existing attack macros while cards are visible.
2. Hold Alt+C from Tokens: select cards, double-click image viewer, right-click native HUD, flip/rotate/stack using CCM controls. Release and verify return to Tokens. Rebind if needed.
3. Drag a card, release the shortcut mid-drag, finish dropping. Ensure only one move and no premature return. Test cancellation/Escape, blur and drawing from a locked deck with and without an active GM.
4. Drop cards into Allocate Card regions. Check native allocation, source/destination contents and exactly one operation; test restricted/hidden cards as a player.
5. Overlap tokens and cards: Tokens normally, CCM while held. Verify clicks beyond visible card bounds follow native background behavior and no hidden card becomes selectable.
6. Switch scenes, redraw canvas, change tools manually while held, disable the setting, repeat key presses and reconnect. No stuck layer or duplicate operations/listeners should remain.
7. Disable/uninstall CCM and launch the system. Verify no errors or changed Token behavior. Re-enable CCM and reload, then repeat.
8. Have two players independently use the shortcut and interact with separate/shared cards; check native permissions, locked-deck drawing and allocation. Record results before claiming runtime compatibility.
