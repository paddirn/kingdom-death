# Decisions

- **Exact target 14.365.** Manifest minimum and maximum both 14.365. `verified` omitted until actual runtime testing. V14 documentation may reflect later V14 patches; avoid known later APIs and explicitly test build 365. No V15 APIs used intentionally.
- **Modern document sheets.** Use TypeDataModel, HandlebarsApplicationMixin, ActorSheetV2, ItemSheetV2 and DocumentSheetConfig registration during init. Retain native document CRUD, ownership and embedded Item drop behavior; no legacy ActorSheet or template.json.
- **Settlement is campaign authority.** Matches proposed Actors and keeps campaign-wide state persistent and shareable. Only active settlement selection is a world setting. Four departure slots are the initial standard party UI; a later supported party-size extension can migrate this schema.
- **Manual state before automation.** Damage, survival, population, phase and resource totals are editable. No hidden clamping to campaign limits; unusual effects can be recorded. Numeric nonnegative counters are storage constraints, not full rules enforcement. No generic HP pool is invented for survivors or monsters.
- **Embedded gear references.** Nine keyed slots provide stable coordinates. Shared world Items are templates, not equipped records. Equipment cannot be rotated in this foundation. Affinity storage is deliberately limited to simple edge colors.
- **Explicit Save.** Native forms persist changes after Save. Inventory actions and remote updates can rerender sheets, so instructions tell users to save first. Database transactions, undo, and conflict-safe simultaneous editing are not claimed.
- **Content separation.** Uploaded rules were consulted privately for record structure (including head/brain injury distinctions), not copied into repository. No scanned source or proprietary content enters ZIP/build artifacts.
- **Distribution.** Source commit is not deployment. Allowlisted ZIP is importable via Forge's custom-package workflow. The requested v0.1.0 release publishes both manifest and ZIP assets through a dedicated workflow. Runtime-unverified status is retained; release publication does not imply successful Forge testing.
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
