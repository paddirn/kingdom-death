# Settlement records and shared portrait headers

Target: Foundry V14 build 365 on The Forge. This feature is additive; the reviewed branch does not publish a release. Offline checks cover templates, schema contracts and handlers with doubles, not an executing Foundry installation or visual alignment.

## New persistent Settlement fields

| Path under `system` | Default and meaning |
| --- | --- |
| `timeline.year1` … `timeline.year36` | Each has `active: false`, integer `storyState: 0` (0 blank, 1 swords/book, 2 book), and blank `settlementEvents`, `storyEvents`, `developments`, `births`, `deaths`, `monster` strings |
| `milestones.row1` … `row10` | `checked: false`; rows 6–10 also have blank editable `label` |
| `monsterTracking.quarry.row1` … `row10` | `enabled: false`, independent `levels.level1/level2/level3: false`; rows 4–10 also have blank editable `name` |
| `monsterTracking.nemesis.row1` … `row10` | Same structure as Quarry; independent records |
| `principles.life/death/society/conviction/other` | Blank embedded Innovation Item IDs |
| `departingSurvivalGain` | Nonnegative integer, initially 0 |
| `portcullisKey` | False |
| `lostSettlements.row1` … `row20` | Independent false Booleans |

Fixed names/labels are presentation constants, not copied into Actor data. Schema defaults populate absent fields for older Settlements; there is no destructive migration or startup rewrite. Existing campaign phase/party/quarry, population, notes, equipment accounting and Item IDs are unchanged. Newly introduced strings explicitly allow blanks. Stable object keys avoid array replacement when updating one record.

No new Death Count, Survivor-name, sex or death-status fields are stored. Population resolves accessible World Survivors each render, partitions by `system.dead`, and derives 40 display-only boxes plus the uncapped count. Existing Actor lifecycle refresh hooks refresh an open Settlement when another Actor changes. This is not settlement membership tracking.

## Interaction and persistence

Tab order: Settlement, Population, Timeline, Locations, Monsters, Campaign Settings. All panels remain rendered; only the active ones are shown. The main-only flowchart is a static sequence above the shared header. Save stays accessible in the header on every tab.

Named inputs and checkboxes use the existing abortable draft listener. Year/icon/level buttons add typed values to that draft and update only their own DOM button to preserve timeline scroll and keyboard focus. Actions accept only valid record paths and require an editable owned Actor. Drafts survive rerenders and save includes dirty values even when a field is absent from the submitted panel. Unchecked false values and cleared blank strings are preserved. Failed saves restore drafts. Only modified paths are submitted; concurrent edits to the same field remain last-write-wins.

Principle targets accept only accessible Innovations. Existing owned Items are reused; external world/compendium Items are copied by the existing queued inventory service. The owned copy is created immediately, while the Principle reference is saved with Save Changes. Closing without saving may leave that copied Item in Innovations, intentionally avoiding destructive rollback. Replacement and clearing never delete a source or owned Item. References resolve names live; missing/inaccessible references can be cleared. Innovations remain a single list of actual embedded Items; a Principle is not a second inventory entry. Deleting an assigned Innovation leaves an explicitly missing reference rather than silently discarding the assignment.

Innovations and Storage now use compact names/type/quantity lists. Locations retain their existing portrait card grid. Settlement portraits reuse `actor.img`, native preview and owner-only file picking, never prototype-token artwork. Survivor and Settlement headers share label/control/reminder grid rows; the old margin offsets have been removed.

Rules remain manual: naming reminders, milestones, monster levels, year highlights, departing gain, Portcullis Key and Lost Settlements do not grant Survival, create Actors, select a quarry or advance the phase.

## Manual Forge 14.365 acceptance checks

1. Back up the world. Test a new and an existing Settlement. Confirm old campaign assignments, counts, Items and notes remain unchanged. New controls must default to blank/unchecked/zero.
2. At normal and narrow window widths, inspect both headers: 80px contained portrait, name input, Survivor sex dropdown and Save button sharing a control row. Click portraits to preview, change as owner, and verify immediate refresh and unchanged prototype tokens. Keep a name draft while choosing an image.
3. Check exact tab order and main-only flowchart (all eight steps and seven arrows). Ensure header Save remains accessible while scrolling and on all tabs. Confirm reminders have the exact emphasis and do not grant Survival.
4. Enter unique text in every column of years 1 and 36 and several middle rows. Highlight nonconsecutive years and cycle Story icons blank → swords/book → book → blank. Check that text is independent; horizontal scrolling leaves the year visible. Button clicks should not scroll back to the top or lose focus. Save, close, reload and compare records.
5. Toggle all ten milestones, edit the five custom names, then uncheck several. Test the ten Quarry and ten Nemesis rows, seven custom names in each, and multiple independent levels per row. Save/reload from a different tab. Verify active quarry and Monster Actor collection are unchanged.
6. Set Departing Survival Gain, Portcullis Key and selected Lost Settlement boxes, including 5/10/15/20. Save/reload, then clear/uncheck and repeat. Confirm the fifth-box borders and no change to Survivor Survival.
7. Drop world and compendium Innovations into Principles; drop an already-owned Innovation onto another row. Verify the latter creates no copy. Replace, clear, save and reload references. Click to open the owned sheet; rename the Item and verify the live name. Delete the owned Item and verify a clearable missing indication. Reject Gear/Armor/Resource drops into Principles. Innovations and Storage show compact lists without artwork and retain Add/Edit/Remove/drop controls; Locations remain cards.
8. With two clients, mark a visible Survivor dead and alive. The open Population tab should refresh both lists and Death Count. Verify name/sex changes, actor creation/deletion, zero dead and more than 40 dead. Count only accessible World Survivors, and never change the manual Population value. Death boxes cannot be edited.
9. Make edits in several tabs, switch tabs, trigger an Actor rename or Item update, then Save from Campaign Settings. Confirm drafts, false checkboxes and active tab survive. Test a failed save and retry. Test Observer: navigation, permitted Item/Actor sheets and portraits work; numeric/checkbox/button/drop/image-change mutations do not.
10. Recheck Survivor Gear/Armor damage and equip lifecycle, Specials, Family, Monster setup, existing campaign controller and release ZIP structure. Runtime/visual verification must be recorded separately from the automated checks.
