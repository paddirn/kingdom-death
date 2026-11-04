# Family, Proficiency and image controls

Target remains **Foundry 14.365** on The Forge. This feature branch does not publish a release or change the stable manifest URL. No proprietary artwork or content is included.

## Survivor records

The five tabs are Attributes, Gear, Specials, Family and Image. Sex still stores `""`, `"M"`, `"F"` while displaying Unspecified/Male/Female; its local color bar follows unsaved changes. Survival, Insanity and armor use square number fields with controls below. Hunt XP, proficiency XP, Courage and Understanding totals are read-only views of their existing fields, updated immediately by progression clicks. They are not separately calculated/stored totals. Conditions and Notes span both columns. Five custom counters join the existing bleeding count; stable `customTokens.token1` through `token5` each hold `{label, value}`. Labels default to `_ tokens`, counts to zero.

`proficiencyUuid` defaults to a permitted blank string. Select a world Proficiency Item, paste its UUID, or drop one on the link area; Use UUID resolves and previews the name. Save Changes persists the link. The legacy `weaponProficiency.type` text remains editable, with all existing value/specialist/master data intact. Missing/inaccessible links remain visible and clearable without blocking unrelated saves. New links require an accessible Proficiency Item; links grant no compendium permissions. Gear drops elsewhere retain native copying behavior.

## Proficiency Items

The `proficiency` subtype adds blank-permitted `type`, `description`, `rank` (specialization/mastery; default specialization), and a structured `keywords` string array. Only this new subtype uses an array; existing Item keywords remain unchanged free text. Enter/Add creates trimmed tags, case-insensitive duplicates are ignored, × removes a tag. Save Changes persists fields and tags. Descriptions preserve plain-text line breaks.

`KDMItem` derives the name during pre-create/pre-update, without a recursive update call. Empty Type becomes `Proficiency (specialization)`. Type/Rank also update the displayed name while editing. Renaming preserves the same Item UUID. Other Item types delegate unchanged to native document behavior.

## Family relationships

`family.parents.{parent1,parent2}` holds two independent world Survivor IDs (blank by default); `family.children` is a default-empty array of world Survivor IDs. Sex has no bearing on slot selection. IDs survive renames. Names, portraits and death indicators resolve live from visible world Actors; deleted/inaccessible references show a placeholder. Create/update/delete Actor hooks refresh open Survivor sheets while retaining dirty form fields.

Use each dropdown and Assign/Add Child, or drop a world Survivor on a slot. Clear removes both sides. A permanent Add Child slot remains after the children. Clicking a portrait/name opens that Actor. Family assignments **save immediately**, independently of Save Changes. The pure planner rejects self-links, duplicate parents/children, cycles and children with two parents. Replacing a child first removes the old reciprocal link in the planned batch. Missing IDs can be cleared.

Every affected Actor requires ownership before any write. If permission is missing, ask a GM to repeat the operation using the same Family tab; there is no socket-based privilege escalation. Unlinked token Actors cannot edit the world family graph. Plans update all affected world Actors through one native `Actor.updateDocuments` call. A local queue serializes this client's family actions. Native multi-document operations are not a cross-client transaction: coordinate family edits with other users. If a module cancels part of a batch, verification reports an explicit GM repair warning; inspect both sheets and reassign/clear the link. Do not edit family JSON with macros/imports without maintaining reciprocity. Importing Actors into another world requires reference remapping, which is not supplied here.

## Images and permissions

All Item types use the same image header and native `img`. Gear thumbnails are square, all other Item thumbnails are 9:14 at 120px wide. Thumbnails crop via CSS only. The preview link uses V14 ImagePopout with the original source; Observers can preview, Owners can select. The shared picker uses the configured FilePicker implementation when present, for hosting integrations, otherwise the native V14 class.

The Survivor Image tab writes either `img` or `prototypeToken.texture.src` through narrow document updates. These actions save immediately and do not submit/discard other form drafts. Prototype token edits do not update existing Scene Tokens. No duplicate image data is stored in system fields.

## Validation and manual acceptance

Offline tests use API doubles, not licensed Foundry execution. They cover defaults/serialization, names and tags, schema registration, reciprocal plans, cycles, full slots, missing/dead references, permission preflight, interrupted updates, image paths/permissions, UUID filtering, progression/drafts, existing gear/settlement behavior and packaging. Actual Foundry rendering, browser reload persistence and Forge image dialogs remain unverified.

On a backed-up Foundry **14.365** test world:

1. Run `tools/runtime/survivor-defaults.js` as a Script Macro. Create a new Survivor and Proficiency through native dialogs. Open an existing Survivor and each existing Item type.
2. Resize Attributes; check header Sex labels/bar, square number alignment, six responsive counters, radio outlines and full-width Notes. Check/uncheck all four progression tracks; totals must update without editable steppers. Save/reload all new counters and Sex values.
3. Enter unsaved notes, change tabs, add/delete gear, and cause a remote Actor update. Drafts and selected tab must remain. Save/reload and verify gear IDs, Specials and survival actions.
4. Create Proficiency Type/Rank, tags via Enter/Add, duplicate tags, removal and multiline description. Save/reopen; verify generated name and unchanged UUID. Repeat Item edits as Owner and Observer.
5. Link by world selector, UUID, compendium drop and owned Item UUID; reject Gear UUID. Rename/delete the linked Item, verify placeholder/name refresh, clear link, and retain legacy type/XP. Drop Gear outside the link area to verify inventory behavior.
6. Create three generations of Survivors. Assign/replace/clear parents and children using dropdowns and drag/drop; inspect reciprocals. Reject self, duplicates, cycles and a third parent. Try a missing-permission link; no Actor should change, then have the GM apply it. Delete a linked Actor and clear the placeholder.
7. Rename, change portrait and mark a relative dead from another sheet/client; verify refresh and red X overlay. Open linked sheets as an Observer. Confirm observers cannot mutate relationships.
8. Choose each Item image and preview it as Owner/Observer. On Forge verify file selection/upload permissions. Choose separate Survivor avatar/token images, Save/reload, place a new token and verify previously placed tokens retain their textures.
9. Smoke-test Monster and Settlement numeric steppers and campaign selection. Build/install through the unchanged release process only after review.

Official API references used: [ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html), [FilePicker](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.FilePicker.html), [ImagePopout](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.ImagePopout.html), [Item](https://foundryvtt.com/api/v14/classes/foundry.documents.Item.html). Public V14 docs do not establish that this code has run on build 365.
