# Architecture

## Responsibilities and storage

| Path | Responsibility |
| --- | --- |
| `system.json` | Package identity, exact target range, declared document subtypes |
| `scripts/main.mjs` | init registration, settings, public API, lightweight refresh hooks |
| `scripts/models/` | Foundry TypeDataModel schemas and field defaults |
| `scripts/rules/` | Pure, platform-independent validation and grid geometry |
| `scripts/sheets/` | ApplicationV2 actor/item context and user actions |
| `scripts/family/` | Pure reciprocal relationship planning, world update service and view context |
| `scripts/inventory/` | Per-Actor queued copying, gear assignment, clearing and deletion cleanup |
| `scripts/ui/` | Shared numeric controls, image picker/preview and draft utilities |
| `scripts/documents/` | Proficiency Item lifecycle naming without recursive updates |
| `scripts/campaign/` | Active settlement selection and central phase controller |
| `templates/`, `styles/`, `lang/` | Escaped Handlebars views, scoped CSS, type labels |
| `tools/`, `tests/` | Static validation, allowlisted packaging, offline checks |

Native Actor/Item documents store all user edits. No gameplay state is stored in DOM nodes, localStorage, static JS variables, or browser-only models. The active settlement ID is a world setting; campaign data lives on that Settlement Actor. The Settlement sheet doubles as the initial campaign dashboard, avoiding duplicate state. Multiple settlements can exist but only one is active through the controller.

## Models

All types have `schemaVersion: 1` and plain-text `notes`. Survivor has `attributes`, `survival.{value,limit}`, `insanity`, `brainInjury`, `bleeding`, `huntXP`, `understanding`, `courage`, `retired`, `dead`, `knockedDown`, `locations.{head,arms,body,waist,legs}`, and `gearGrid.slot0` through `slot8`. Each location stores armor and heavy injury; all except head also store light injury. These are editable records, not automated damage resolution.

Gear grid is nine keyed embedded Item IDs in fixed row-major order. Each owned item represents one physical gear copy. Duplicate names are allowed; duplicate IDs in the grid are not. Coordinates and adjacency live in pure rules, so later affinity logic can operate without sheet HTML. Gear stores four color edges; special/complex affinity patterns are deferred. Inventory deletion clears equipped references; native/macro deletion has an initiating-owner cleanup hook. Legacy missing references remain visible and individually clearable.

Monster stores editable level, movement, toughness, wounds (manual tally), accuracy/damage/speed/luck/evasion modifiers, and `decks.{ai,hitLocation}` UUID strings. Native Cards documents will own decks later. These references do not validate, create, draw from, or grant access to decks.

Settlement stores lanternYear, population, endeavors, survivalLimit, and campaign `{phase, party, quarryId, hunt, showdownSceneId}`. Party is four keyed world Actor IDs. Hunt positions are nonnegative manual coordinates without a defined track length. Population is independent of created survivor records. Scene ID is only a reference and is not activated automatically.

Inventory uses native embedded Items. Gear adds attack profile and affinities; Resource adds nonnegative integer quantity. Proficiency Items add Type/Rank, generated names, structured keyword tags and description; other Item types retain source, free-text keywords and notes. Core keeps no hardcoded content lists. Individual survival limits remain manual and are not forced to the settlement limit.

## Permissions and concurrency

Native document ownership protects mutations. The controller checks ownership too. GM selects active settlement; Observers can view and Owners can edit it. Creating a settlement does not auto-grant permissions. The shared dashboard refreshes via native document sheets and world Actor selector hooks. Foundry performs synchronization; no custom socket authority or permission escalation exists. Whole-form Save is explicit; no collaboration lock or conflict resolution beyond Foundry's last-write behavior is implemented. Coordinate simultaneous editing of the same record. Survivor and Item form drafts survive document-driven rerenders until Save; closing the sheet loses unsaved edits. Family and image actions make narrow immediate updates.

Grid/party validation runs on custom form submission. Pure helpers are also available to future services. This is not a server-side uniqueness constraint: direct macros/imports may create stale or duplicate references, which are surfaced/rejected on subsequent sheet save. Foundry field validation governs scalar types/ranges. Never regard client validation as an authorization boundary.

## Extend Actor or Item types

1. Add subtype to `system.json.documentTypes.Actor` or `.Item`; declare `htmlFields`/`filePathFields` if needed. Do not insert private content.
2. Add a TypeDataModel under `scripts/models`; reuse field factories. Register it in init through `CONFIG.Actor.dataModels` or `CONFIG.Item.dataModels`.
3. Add a type label in `lang/en.json`; add/register its sheet with DocumentSheetConfig or reuse the generic Item sheet.
4. Add escaped template fields and tests. Include the type in packaging validation and target-runtime smoke tests.
5. Before changing persisted field meaning, implement a versioned, GM-controlled, idempotent migration with backups. `schemaVersion` is a marker only; no migration engine is claimed in 0.1.0.

## Extend campaign behavior

Add schema fields on Settlement, pure operations under `rules`, then controller methods that validate authorization/references and write narrow document updates. UI calls these methods rather than owning rules. `game.kingdomDeath.campaign.setPhase("hunt")` is available for scripts; it performs only a validated phase change. Do not scatter writes across several documents until a failure/recovery strategy exists. Future hunt/showdown applications should observe the active Settlement instead of creating parallel campaign stores.

## Content and future packs

Enter private content through Actor/Item/Cards directories now. Native document export/import is available; no proprietary importer is bundled. Future authorized content should use separate Foundry modules with compendium packs (`Actor`, `Item`, `Cards`, `RollTable`, `Scene`, etc.) declaring the `kingdom-death` system dependency, or append pack entries to the system manifest for distributable original content. Follow Foundry's V14 compendium tooling; do not ship raw JSON as if it were a compiled pack. Import content into a world before referencing world IDs. Keep UUID mapping/import remapping in an importer service. Game modules may provide typed records without altering the core engine; bespoke effects should use an explicit future resolver registry and manual fallbacks, not executable code in card text.

## Additive family and proficiency fields

See [family/proficiency/image architecture](family-proficiency-images.md) for new schemas, failure handling, immediate versus deferred saves and the Foundry 14.365 manual checklist. Existing data paths are not removed or migrated. Family links are world IDs; proficiency links are Item UUIDs.

## Item drop routing

See [Survivor UI and Item drop targets](survivor-drag-drop.md) for routing, queued mutations, failure handling and pending runtime checks. Grid operations save immediately; form submission excludes old grid snapshots. No schemas or saved paths change.

## Survival bounds

`scripts/rules/survival.mjs` owns nonnegative integer normalization and the Current ≤ Limit rule. The Survivor sheet applies it live (including draft input events) and on submission. `SurvivorData._cleanData` normalizes complete pairs after field cleaning; partial updates do not inject defaults. `validateJoint` rejects invalid pairs if validation is invoked without cleaning. Normal Foundry model/document workflows therefore cannot accept an over-limit pair; intentional bypasses of client validation are not a server security boundary. Existing over-limit source pairs are normalized when loaded/cleaned, and saved through normal updates. No other Survivor fields or shared field factories change.

The exact 14.365 macro/update lifecycle still needs the runtime checks in `docs/survivor-drag-drop.md`; offline tests exercise the contracts, not Foundry's implementation.
