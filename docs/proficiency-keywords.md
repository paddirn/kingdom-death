# Proficiency, Specials and shared Item tags

Proficiency Rank now offers None, Specialist and Master in one horizontal group. New Items still default to the former specialization role, now stored as `specialist`. Names derive from Type on save: `Sword`, `Sword (specialist)` or `Sword (master)`; blank Type uses `Proficiency`. Existing document IDs, images, descriptions, Source and UUID references are retained.

## Migration

Foundry's TypeDataModel `migrateData` maps `specialization` to `specialist` and `mastery` to `master` before schema validation. All Item models inherit keyword migration: an empty/whitespace string becomes `[]`; any nonempty legacy string becomes **one trimmed tag**, including commas and other punctuation. No established delimiter existed, so migration never splits punctuation. Arrays are trimmed and deduplicated case-insensitively, preserving first spelling and order. Missing fields receive the ArrayField's empty default during normal model construction. This applies to world and embedded Items through their registered data models; no documents are deleted or recreated. Model migration is applied on loading; saving the Item writes the canonical array and current rank/name. No bulk writes or compendium unlocking run at world startup.

All Item sheets share the same tag markup, draft buffer, Enter handler and normalization utility. Enter prevents form submission and adds the tag; no Add button exists. Source is the last editable field. Keyword and ordinary form drafts survive rerenders and failed saves.

Survivors store additional links in `system.additionalProficiencies`, an array of UUID strings defaulting to `[]`. The primary `system.proficiencyUuid` remains independent. Additional drops and unlinking are drafts until Save Changes, matching primary proficiency behavior; unlinking never deletes the source Item. Duplicates are ignored. Missing/inaccessible references show a clearable label, never raw UUID text. Existing `weaponProficiency.specialist` and `.master` values remain in the schema and are omitted from submission rather than erased. Primary XP tracking is unchanged.

Specials combines embedded Fighting Arts and Abilities for display only; each retains its own Item type and editable sheet. Fighting Arts retain their informational maximum of three. Disorders retain their own maximum, Skip Next Hunt and the existing Impairments text at the bottom. Once Per Lifetime spans the two columns. No abilities or limits are automatically enforced.

## Manual Foundry 14.365 / Forge acceptance checks

These checks have not been executed in a running Foundry instance. Offline tests use document/model doubles, not Foundry's validation/database implementation.

1. Back up a world, install a release containing this PR, restart Forge and reload clients. Confirm system version and Foundry 14.365. A feature PR does not publish a release.
2. Open an old world Item and an old Survivor embedded Item with string keywords. Check empty strings, punctuation-containing strings and existing arrays. Save/reload and inspect `item.toObject().system.keywords`: expect an array without loss of nonempty text. Confirm image, Source, notes and UUID identity persist. Open an older compendium Item without unlocking it; confirm it remains readable.
3. Open legacy Proficiency Items with specialization/mastery; confirm the corresponding radio is selected. Save and verify the sidebar title. Test all three ranks and blank Type. Confirm one horizontal radio group and no validation errors.
4. For every Item type add tags with Enter, spaces, duplicates and mixed capitalization; remove a chip, trigger an image rerender, Save and reload. Enter must not save/close the form. Confirm Source appears once at the bottom and persists. Observer sheets must not permit edits.
5. On a Survivor, drop world, embedded and compendium Proficiency Items onto primary and additional areas. Confirm matching highlights, independent links, duplicate prevention, two-column clickable names, unlink without deletion, missing-item fallback and Save/reload persistence. Change primary and verify additional links remain. Invalid Item types must warn without changes.
6. Drop Fighting Arts and Abilities onto the combined Specials module; verify type suffixes, Add controls, clickable embedded sheets, independent editing/removal and no combined limit. Drop Disorders into Disorders & Impairments. Edit Skip Next Hunt and Impairments, then Save/reload. Confirm Once Per Lifetime still persists.
7. Keep unsaved notes while changing tabs and making drops. Verify draft preservation, existing gear moves/inventory actions, family links, image selection/previews, Survival bounds and progression tracks. Smoke-test Living Glossary import using its original example file.
