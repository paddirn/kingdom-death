# Armor, Settlement tabs and Survivor portrait

Targets Foundry V14 build 365 on Forge. No new runtime dependency, content pack, artwork or release workflow. Version is unchanged until reviewed release. Automated tests use document/schema doubles; actual Foundry rendering, validation, multiplayer persistence and picker behavior remain unverified.

## Armor accounting contract

Armor shares EquipmentData's keywords, source, description (`notes`) and edge affinities with Gear. Only Gear has `attack`; Armor has nonnegative integer `armor.{head,arms,body,waist,legs}`. Armor occupies one of the nine existing embedded-ID slots. Inventory alone grants nothing. Equipping adds capacity, moving preserves remaining protection, unequipping removes only the remaining protection; re-equipping is a fresh grant. Existing macros selecting `gear` still select weapons, not Armor.

Survivor `armorLedger` is a structured schema: initialized Boolean, independent balance per location, entries array with stable itemId and per-location granted, remaining and damage. Defaults are uninitialized/zero/empty. No startup or rendering writes occur. On the first normal Actor update, existing location armor becomes independent protection; it is not reset. The ledger is persisted only through normal document changes.

Manual reductions consume equipped contributions in ascending embedded Item ID order, then independent armor. Manual increases add independent armor; they do not repair an Item's ledger contribution. Each location is independent. Item capacity edits preserve accumulated damage: remaining = max(0, new capacity − damage). Reducing capacity below damage retains that damage debt for subsequent capacity increases. Changing an Item never changes its own properties as a consequence of Survivor damage.

Example: A provides 3 Head; reducing current Head to 1 records 2 damage. Removing A removes 1. A/B each provide 2 Body; reducing 4 to 3 depletes one point from the lexically first embedded ID. Removing that Item removes 1; removing the other removes 2. Any manual balance remains separate.

`KDMActor._preUpdate` reconciles normal flat/nested Actor updates, not just sheet drops. It never mutates source state before success. Grid and totals/ledger commit together. Survivor form saves omit untouched armor inputs; pending manual armor edits are saved before sheet inventory operations. Committed embedded Armor creates/stat updates request reconciliation. Committed deletion clears references and removes remaining contributions. Canceled Item deletion leaves both grid and protection unchanged. Item/Actor writes remain separate documents: if cleanup fails after deletion, a warning requests clearing the missing grid cell; that clears references and reconciles the surviving ledger. Failed assignments retain the owned copy for retry.

Same-client inventory operations and Actor updates are queued; repeated owned drops do not copy or grant twice. Grid updates send changed slots only. Canceled/failed Actor writes do not commit the proposed ledger. This is not a distributed lock or a server compare-and-swap protocol: truly simultaneous writes from different clients or bulk static updateDocuments calls can race. Coordinate equipment/damage editing per Survivor, then verify totals after competing edits. No claim of conflict-free multi-client transactions is made. The initiating owner performs Item-hook reconciliation; disconnection before a follow-up write can require clearing the stale slot or saving the Survivor. Data is never silently destroyed to roll back a failed operation.

## Settlement and portrait

Settlement, Population, Timeline, Locations, Monsters and Campaign Settings tabs keep selection and named-field drafts across rerenders. Only changed fields submit. Hidden phase, party and quarry are retained and do not invalidate ordinary form saves. Population is a live Observer-accessible World Survivor list, independent of the manual count. Existing Actor lifecycle refresh hooks rebuild names and sex suffixes. Innovations/Locations/Storage are filtered views of actual embedded Items; other legacy Item types remain stored, not deleted. Source Items are unaffected by removing owned copies. Location cards follow Item sort order; drag reordering is intentionally deferred.

The header portrait is actor.img, including Foundry's existing default. Click to preview, use Change to choose another image when owner. Native Actor updates refresh the header immediately and retain other form drafts. The prototype token is not changed.

## Manual Forge 14.365 checklist

Back up the world and install a package built from this branch into a test environment; do not treat the existing published release ZIP as this feature.

1. Create every Item type, including Armor. Verify five zero defaults, integer/min constraints, tags, four affinities, image picker/preview, description and Source persistence. Verify Gear attack macros/fields remain unchanged.
2. Open an old Survivor with existing armor. Rendering alone must not change source data. Save, reload and confirm old protection remains independent. Create Armor with 1/2/2/1/1, add to inventory (no protection), equip in each of nine slots (one grant). Reject duplicate references and non-equipment drops.
3. Equip two Armor Items. Reduce totals, save, reload world. Inspect ledger and original Items. Move between slots, remove partially damaged contributors, unequip/re-equip and delete through sheet and native Item actions. No negative totals or automatic restoration on render.
4. While damaged, raise/lower permanent Item protection, including capacity below damage and back up. Verify remaining = capacity minus recorded damage. Manual additions remain after unequip.
5. Edit current armor but do not save; move/clear/delete equipment. Confirm the pending manual edit commits first and subsequent Save cannot overwrite the equipment change. Cancel removal; force failed/canceled updates in a test world and retry. Verify no duplicate grant or deletion rollback repair.
6. Rapidly drop/move multiple Items from one client. Use two owner clients to test competing edits and document any lost-update behavior; coordinate real play until runtime concurrency checks are complete. If post-delete cleanup fails, clear the missing cell and verify remaining totals.
7. Settlement: four square counters with buttons below, min zero, keyboard edits, narrow layouts. Save/reload counts; verify stored phase/party/quarry unchanged even if references are missing. Edit settings, switch tabs, trigger another Actor rename, and confirm drafts survive.
8. Drop Innovations and Locations from directory/compendium into their respective areas. Reject wrong types; repeat an owned-item drop without copying. Check image contain, four/three/two/one Location columns, stable sort order, native edit, cancel removal and confirmed owned-copy removal. Storage shows only Gear/Armor/Resources.
9. Create, rename, change sex and delete a World Survivor. Population must update, omit inaccessible Actors and open permitted sheets. Manual Population never autochanges. Test Observer users: tabs/previews/accessible sheets work, all edits/drops/removals are blocked.
10. Survivor portrait: default/custom image, 80×80 contain, full preview, owner-only Change, immediate update, all five tabs, unsaved name/sex persistence across picker rerender. Confirm prototype token texture is unchanged. Recheck Gear, Specials, Family and Monster behavior.

The subsequent [Settlement record expansion](settlement-records.md) changes Innovations/Storage to compact lists and adds the manual campaign records. Location card behavior remains unchanged.
