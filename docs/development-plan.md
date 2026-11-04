# Development plan

## Milestone 1 — System foundation (implemented candidate, runtime acceptance pending)

Acceptance: install ZIP on Forge 14.365; launch without errors; create every Actor and Item type; save/reload fields; assign nine distinct gear copies and reject duplicate assignment; persist resource quantity; share campaign across clients under native ownership; select phase/party/quarry; clear deleted references. Offline syntax, template, manifest and logic checks must pass. Follow runtime-checklist.md before marking complete.

## Milestone 2 — Assisted White Lion showdown

Separate attack and wound calculations; deterministic tests; native d10 rolls/chat; movement/actions; survivor damage/injury assistance; native Cards AI/Hit Location deck lifecycle including traps/reshuffles/wounds. Manual targeting, effect resolution and override history. Use privately supplied content, with documented input format and importer checks.

Acceptance: complete a White Lion showdown with four survivors without physical dice, decks or record sheets. Include reload mid-attack, multi-user permissions, depleted decks, trap handling, cancellation and manual corrections. Do not call it playable until this is demonstrated.

## Milestone 3 — Settlement

Resource spending/crafting, storage transfers, innovations, locations, progression and milestones. Validate costs, failed multi-document writes, duplicate commands and overrides. Acceptance: complete a settlement phase and departures with persistent correct inventory and progression.

## Milestone 4 — Hunt

Hunt track scene/UI, positions/events, native rolls, status updates and controlled transition into showdown. Acceptance: complete a hunt with private content, reload safely, and preserve party/quarry state into showdown.

## Milestone 5 — Content and refinement

Authorized monster/equipment packs, expansions, import/export mappings, migration framework, accessibility/localization, complex affinity support and tested automation adapters. Acceptance: a new content module can register data without editing core; unknown effects remain visible/manual.

## Working process

Keep each milestone on a dedicated branch/PR. Add tests for pure rules and permission/update boundaries. Preserve working behavior; refactor shared services as new phases emerge. No merges, releases, or compatibility-verification claims without corresponding review/runtime evidence. Update docs whenever data/UI behavior changes.

## Current Survivor repair / glossary acceptance gate

Implemented offline: native drop controller integration and non-vetoing feedback; persistent header Save; 10+6 XP and readable totals; Survival bounds; GM-only incremental JSON glossary import. Automated contract tests must pass along with existing inventory/family tests and release-package validation. Release acceptance additionally requires the exact [Survivor runtime checklist](survivor-drag-drop.md) and [glossary checklist](living-glossary.md) in Forge on 14.365. These runtime checks are pending, not implied by mocked test success. Live glossary retrieval is deferred pending source permission and a tested supported access mechanism.
