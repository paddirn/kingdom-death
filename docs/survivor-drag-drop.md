# Survivor UI and Item drop targets

Target remains Foundry **14.365**. No schema changes, migrations, release version bump, new runtime dependency or proprietary content is included.

## UI changes

Hunt XP replaces the Survivor module heading. Its track and read-only total remain; age milestone controls are hidden but `ageMilestones` values are retained. Retired now sits between Knocked Down and Dead. Armor fields use accessible location labels without the visible Armor label. Survival Limit uses one line. The header's existing horizontal separator follows Sex; decorative borders and the active-tab underline remain unchanged.

The paired Attributes columns share two CSS Grid rows via subgrid. Survival and Hunt XP share a height; lower modules use available height without fixed section heights. Narrow windows stack the columns. Condition & Notes remains full width. Visual balance still requires live Foundry review.

Proficiency has one compact drop area: empty hint, name-only native document link, or a missing-reference message. The entire module accepts only accessible Proficiency Items. A replacement remains a draft until Save Changes, consistent with prior proficiency behavior. The UUID and legacy Type text are retained in the model but no longer shown as inputs. The native content link opens the Item with Foundry permission handling. There is no visible clear-link control, as requested; replace a missing link by dropping a valid Item.

Gear is a square 3×3 image grid using the same `slot0`…`slot8` embedded Item IDs. Click a card to open it; drag a card or inventory entry to move it. A cell's × unequips without deleting. Inventory uses three columns (two/one when narrow), clickable names/thumbnails and confirmed × deletion. Specials use two columns and type-specific module targets, while preserving their existing controls.

## Drop routing and persistence

`scripts/ui/item-drops.mjs` resolves the closest `data-kdm-drop` target, checks Item types, suppresses repeated processing of one drop event, and manages highlight listeners. Native ActorSheetV2 resolves the dropped document and generates owned Item drag payloads through `data-item-id`. Non-Item drops on Item targets are rejected; drops elsewhere retain native behavior, including Family Actor drops.

Drag feedback resolves the native Item payload captured during document dragstart. Browsers protect payload reads during dragover, so unknown/unresolved drags are never marked valid. Eligible same-window directory/compendium drags are resolved asynchronously; feedback becomes available on subsequent dragover events. Cross-window or detached-window feedback may be unavailable if the source dragstart is not observable; test this on the target browser. Drop acceptance itself revalidates the actual native document. No invented payload is used. Highlights clear on leave, drop, dragend, Escape, window blur and sheet teardown; movement between a target's children preserves the highlight. Listeners are aborted on rerender/close.

`scripts/inventory/operations.mjs` serializes inventory writes per Actor on this client. A world/compendium Item is copied once into the Actor; an existing owned copy is reused. Gear assignment moves that ID from any old slot, replaces the destination assignment without deleting displaced Items, and calls the existing `validateGrid`. Inventory/gear changes save immediately; unrelated field drafts survive native rerenders. Whole-form Save omits grid state so stale inputs cannot overwrite an immediate drop. Proficiency drafts are injected into Save without exposing a UUID field.

If creation fails, there is no assignment. If assignment fails after creation, the Item remains in Inventory and the warning directs the user to retry with that owned copy. Confirmed deletion clears the relevant slots before deleting; cancellation/failure restores affected empty slots when the Item still exists. An initiating-owner deletion hook also cleans grid IDs after native/macro deletion. Legacy missing cells remain individually clearable. All mutations require ownership; read-only sheets may open links but cannot accept modifying drops.

The queue does not lock other clients. Coordinate simultaneous inventory edits on the same Actor. Foundry's document operations are not a cross-document transaction; module interference or lost permissions can interrupt cleanup, which produces an explicit warning instead of silently deleting inventory data.

## Validation and Foundry checklist

Automated tests cover type/permission routing, nested targets, one-event deduplication, sequential operations, world/compendium copying, owned moves, occupied-cell replacement, clear/delete/cancel/failure handling, stale references, highlight cleanup, hidden legacy fields, UUID drafts, read-only guards and responsive markup/CSS contracts. Existing Family, Image, Proficiency, Gear rules and other Actor tests remain. These tests use API/DOM doubles; they do not establish actual Foundry drag-and-drop or visual rendering.

Pending manual checks on **Foundry V14 build 365 / The Forge**:

1. Open a legacy Survivor. Confirm saved gear and milestone values remain. Check Hunt XP, relocated Retired, armor accessible names, one-line Survival Limit and immediate Sex separator colors. Save/reload statuses and XP.
2. Resize Attributes at normal/narrow widths: top-module heights match, lower columns align, no clipped controls or excessive blank areas, Condition & Notes spans the full width. Check Specials two/one-column and Inventory three/two/one-column layouts.
3. Drop world and compendium Gear into all nine cells. Verify one copy per drop, images/names, persistence after reload, and only the hovered cell highlighting. Move owned Gear from Inventory and between cells; check no duplicate copies or slot IDs.
4. Replace an occupied cell, then clear it. Both Items must remain in Inventory. Delete an equipped Item with ×; confirm its grid reference disappears. Cancel deletion and verify nothing changes. Repeat deletion through native Item controls.
5. Drag Proficiency onto any child of its module. Only its name appears, the link opens, and Save/reload preserves it. Reject Gear there without changing the link. Delete the linked source, verify the missing message, then replace it. Legacy Type and XP must remain untouched.
6. Drop each matching Item into Fighting Arts/Disorders/Abilities; reject mismatches. Re-drop an owned Item without duplication. Verify all Add/Edit/Delete, restrictions, notes and other fields still work.
7. Test moving across child elements, dragleave, Escape, dragend, and dragging between detached windows if used. Check read-only sheets never modify data or show valid-drop feedback, but allow opening Items.
8. Keep notes/radios/checks unsaved while dropping Items or receiving remote updates. Confirm drafts and selected tab remain, then Save/reload. Smoke-test Family/Image tabs, Monster/Settlement sheets and Item images/tags.

Official V14 references: [sheet drag-and-drop conventions](https://foundryvtt.com/api/v14/modules/foundry.applications.sheets.html), [ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html), [TextEditor drag data](https://foundryvtt.com/api/v14/classes/foundry.applications.ux.TextEditor.html). No V15 APIs are required.
