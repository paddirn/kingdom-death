# Decisions

- **Exact target 14.365.** Manifest minimum and maximum both 14.365. v0.1.1 adds `verified: "14.365"` at the user’s request to supply explicit compatibility metadata. This changes the advertised compatibility label; it does not establish that runtime testing passed. V14 documentation may reflect later V14 patches; avoid known later APIs and explicitly test build 365. No V15 APIs used intentionally.
- **Modern document sheets.** Use TypeDataModel, HandlebarsApplicationMixin, ActorSheetV2, ItemSheetV2 and DocumentSheetConfig registration during init. Retain native document CRUD, ownership and embedded Item drop behavior; no legacy ActorSheet or template.json.
- **Settlement is campaign authority.** Matches proposed Actors and keeps campaign-wide state persistent and shareable. Only active settlement selection is a world setting. Four departure slots are the initial standard party UI; a later supported party-size extension can migrate this schema.
- **Manual state before automation.** Damage, survival, population, phase and resource totals are editable. No hidden clamping to campaign limits; unusual effects can be recorded. Numeric nonnegative counters are storage constraints, not full rules enforcement. No generic HP pool is invented for survivors or monsters.
- **Embedded gear references.** Nine keyed slots provide stable coordinates. Shared world Items are templates, not equipped records. Equipment cannot be rotated in this foundation. Affinity storage is deliberately limited to simple edge colors.
- **Explicit Save.** Native forms persist changes after Save. Inventory actions and remote updates can rerender sheets, so instructions tell users to save first. Database transactions, undo, and conflict-safe simultaneous editing are not claimed.
- **Content separation.** Uploaded rules were consulted privately for record structure (including head/brain injury distinctions), not copied into repository. No scanned source or proprietary content enters ZIP/build artifacts.
- **Distribution.** Source commit is not deployment. Allowlisted ZIP is importable via Forge's custom-package workflow. The v0.1.0 release published both manifest and ZIP assets through a dedicated workflow. Subsequent releases use the manual reviewed-release workflow and check actual uploaded bytes. Runtime-unverified status is retained; release publication does not imply successful Forge testing.
- **Repository bootstrap.** Repository initially had no commits. A README-only main commit establishes a PR base; implementation stays on `feat/system-foundation`.

## Official API references consulted

- https://foundryvtt.com/releases/14.365
- https://foundryvtt.com/article/system-development/
- https://foundryvtt.com/article/system-data-models/
- https://foundryvtt.com/api/v14/modules/foundry.applications.sheets.html
- https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html
- https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
- https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ItemSheetV2.html
- https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
- https://forums.forge-vtt.com/t/how-to-upload-a-modified-version-of-a-module-system/10510

Consulted November 3, 2026. Published API documentation is evidence for conventions, not proof of target-build execution.

## Family, proficiency and images

- Keep existing proficiency Type text/XP unchanged; add an optional UUID for typed Items. New Proficiency keywords are an array without changing existing Item keyword schemas.
- Derive Proficiency names in a native Item subclass before persistence; never recursively update after a rename.
- Family nodes reference world Actor IDs and resolve live images/names. Reciprocal edits use a pure plan, ownership preflight and one native batch, with explicit interruption warnings. Cross-client transaction/locking is not claimed. A GM uses the same UI when a player lacks ownership.
- Shared FilePicker/ImagePopout helpers use native image paths; avatar/prototype token changes are independent and immediate.
- Preserve all form drafts across document rerenders; family/image controls are separate immediate actions. See the new feature checklist for pending runtime verification.

## Compact Survivor drop targets

- One closest-target router validates native resolved Items; no custom drag payload format. Event identity prevents one drop from creating two copies.
- Inventory writes are queued per Actor on a client. Existing owned Items move; outside Items copy once. Replacement/clearing never deletes displaced Items. Failed assignment preserves the copy in Inventory for recovery.
- Grid mutations save immediately and are omitted from whole-form submission. Proficiency remains a Save Changes draft; existing UUID and legacy text paths are retained.
- CSS subgrid aligns top modules without fixed section heights. No runtime or visual verification is implied by template/CSS tests.
