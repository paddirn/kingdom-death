# Survivor sheet redesign

Uses the supplied flattened official Survivor record as a visual reference only: bordered information blocks, six stat boxes, a two-column Attributes view, injury rows, and boxed progress tracks. No PDF, scanned artwork or rule passages are distributed. Gear and Specials occupy separate tabs as requested; the printed sheet places Specials alongside attributes. Narrow windows stack the Attributes columns. The native HTML fields remain functional, with one Save button for ordinary fields across all tabs. Progression totals are read-only views of the editable checkbox tracks.

## Data and interactions

All existing fields and embedded Item IDs are preserved. Additive defaults require no migration: sex defaults to unspecified; cannotSpendSurvival, cannotUseFightingArts, skipNextHunt, rerollUsed and four ageMilestones default false; impairments and oncePerLifetime default empty. weaponProficiency holds type, value, specialist and master. Existing progression counts remain authoritative. Tracks are editable representations of those counts; bold milestone outlines are references only. Age, specialist/master and all effects are resolved manually. Maximum 3 is informational only.

ApplicationV2's native tab action, TABS configuration and tabGroups maintain the active tab on the sheet instance. Switching tabs changes visibility without rebuilding/submitting the form. All tabs remain inside one form, including hidden inputs. Draft named inputs are captured on input/change and restored after document-driven rerenders. Untouched fields show current document data; conflicting local drafts stay local until Save. Successful submission clears the submitted draft, failed submission retains it. Closing/reloading the browser ends this in-memory draft: Save before closing. This is not a collaborative merge protocol.

Gear assignment and duplicate-slot validation are reused. Native inventory Item drop behavior is inherited; the dedicated Proficiency link zone intercepts drops to reference Items without copying them. Specials filter fightingArt, disorder and ability embedded Items and reuse the existing guarded Add/Edit/Remove actions. Draft restoration also covers rerenders caused by embedded Item changes. All controls obey native sheet edit permissions; tab navigation is available to viewers.

## Validation

Offline tests cover new schema/default contracts, legacy path retention, filtered Item context, active-tab markup, draft text/unchecked-checkbox restoration, successful and failed Save, and existing gear validation. These use API stubs and do not prove Foundry persistence or rendering.

Runtime acceptance on Foundry **14.365** is pending. Test a legacy Actor and a new Actor, all five tabs at wide/narrow sizes, unsaved text and checkbox edits while switching tabs/adding/deleting Items/receiving remote updates, Save/reload of every new field, invalid duplicate gear assignment, progression editing above/below milestone values, and Owner versus Observer behavior. Confirm native drag/drop still copies gear, and that Specials create/edit/delete refresh their own lists. No Monster or Settlement interface change is part of this redesign. Release/version publication is a separate reviewed step.

## Blank-default regression correction

Sex explicitly sets `blank: true` while retaining choices `['', 'M', 'F']`. The other new optional text fields (impairments, oncePerLifetime and weaponProficiency.type) also explicitly permit their blank defaults. New Booleans default false, proficiency value is a nonnegative zero, and age markers are Booleans; these have no conflicting range/choice constraints. Existing fields, stored values and shared text() helper are unchanged.

The Node regression constructs the Survivor subclass with defaults under the existing API test double and checks the blank/choice contract. This does not exercise Foundry's actual StringField implementation. `tools/runtime/survivor-defaults.js` is a non-persistent Script Macro regression that constructs the real registered Survivor data model with defaults, validates strictly, and checks blank/M/F values on Foundry 14.365. That runtime regression is supplied but has not been executed in this environment. Also verify Actor creation through the normal Create Actor dialog after installation.

## Refinements

Attributes now places Survival/stat boxes/Brain/Injuries in the left column and Survivor/Hunt XP above Weapon Proficiency in the right. Sex shares the name header row. Informational instructions and original anatomical SVG silhouettes supplement the printed-sheet organization; no cropped icons are shipped.

`survivalActions.{dodge,encourage,surge,dash,endure}` are default-false records. `courageChoice` and `understandingChoice` use explicit blank-permitted enums with an empty default; a None radio returns each group to no choice. All effects remain manual. Existing ageMilestones paths retain their values with XP labels.

Shared `scripts/ui/numbers.mjs` enhances only Actor/Item sheet number inputs. It centers values, merges model numeric limits with HTML limits, adds non-submitting step controls only for editable fields, aligns steps and emits input/change events. Rerenders reuse wrappers and abort the previous numeric listener. Ordinary displays fit at least two characters and expand for existing longer values; stat/Survival/Insanity displays remain square. Native keyboard entry still uses Foundry validation on Save. Radio-aware draft capture preserves independent group selections across rerenders.

Regression coverage includes numeric stepping/bounds/negatives/decimals, disabled displays, wrapper reuse, change events, new schema defaults/enums, radio draft restoration, layout bindings and existing gear behavior. Offline API doubles are not Foundry execution. Visual alignment and live 14.365 behavior remain unverified. On Forge test all sheet types' steppers, keyboard entry, Owner/Observer access, each radio/checkbox through Save/reload, and a remote rerender with unsaved edits. Installation/release workflows are unchanged.

## Family, Proficiency and images

See [feature details and runtime checklist](family-proficiency-images.md) for the five-tab layout, read-only track totals, custom token counters, reciprocal family graph and shared image controls. Family and image actions save immediately; ordinary form fields and Proficiency links use Save Changes.
