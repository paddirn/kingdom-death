# Forge installation investigation — v0.1.0 to v0.1.1

## Evidence from published v0.1.0 assets

Inspected November 3, 2026, using the actual GitHub release assets, not a local source build:

- Manifest: https://github.com/paddirn/kingdom-death/releases/download/v0.1.0/system.json
- Manifest download URL: https://github.com/paddirn/kingdom-death/releases/download/v0.1.0/kingdom-death-0.1.0.zip
- Both URLs resolved and returned the expected JSON/ZIP bytes.
- ZIP SHA-256: `3acdbc58f1d5afe51f7d565372f9bdeb736ccff4729cb650c97e60c967615f20` (matches GitHub asset digest).
- Archive integrity passed; 30 files, all under one `kingdom-death/` directory. `kingdom-death/system.json` is directly inside it. No double nesting or GitHub source-archive folder name.
- Release manifest and embedded manifest match exactly. Version is 0.1.0 and system ID is kingdom-death. Referenced entry modules, relative imports, templates, styles and language files exist with matching case.
- Compatibility minimum/maximum are both 14.365. `verified` is absent.
- There are no required/recommended dependencies or compendium paths that could fail package resolution. No deprecated minimumCoreVersion/compatibleCoreVersion fields or template.json are used. Actor/Item subtypes are declared in documentTypes.

## Findings and limits

Foundry's [Package Management](https://foundryvtt.com/article/package-management/) documentation distinguishes enforced minimum/maximum bounds from advisory `verified`. The [V14 compatibility interface](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageCompatibilityData.html) defines all three as strings. [System development](https://foundryvtt.com/article/system-development/) specifies the matching system directory/ID and manifest; [data models](https://foundryvtt.com/article/system-data-models/) describes documentTypes. BaseSystem provides its own static system type; adding an undocumented top-level type field is not a justified repair.

Missing verified metadata is consistent with the reported **Compatibility Unknown** label. It is not established as the sole cause of the system being absent from world creation. No additional manifest/layout defect was found in the downloaded release. We have not run Foundry's own BaseSystem validator or reproduced Forge's selector. The published V14 API reference may reflect later V14 patches; no newer API was added in this correction.

v0.1.1 explicitly declares all three fields as `14.365`, as requested. This may cause a green verified label. It is package metadata, **not a claim that a live Foundry/Forge test passed**. Foundry's label normally communicates verification; the README/release notes therefore explicitly disclose that runtime verification is still pending. Minimum/maximum remain unchanged; newer builds are not supported by this manifest.

Potential remaining causes to investigate on the actual host include a cached v0.1.0 installation, a different server build selected for the game, a package installed to another account/game context, or a server-side package-validation/discovery error. These are hypotheses, not findings. System sheet JavaScript cannot be meaningfully tested before creating/loading a world.

## Install and verify after the PR is merged and v0.1.1 published

1. Publish via **GitHub Actions → Publish reviewed release → Run workflow**, main, version `0.1.1`. Confirm the workflow, including public-URL verification, succeeds. Before publication the following version-specific URL does not exist and `/latest/` still serves 0.1.0.
2. In the same Forge account/game, confirm the selected Foundry version is exactly **14.365**, not just “V14.” Stop the server.
3. Use Forge's custom manifest installation/update control with `https://github.com/paddirn/kingdom-death/releases/download/v0.1.1/system.json`. Do not use the repository HTML page or the raw PR manifest (which would point to an unpublished ZIP before release). Confirm the installed system version is **0.1.1**. If a custom-package update lock is enabled, unlock it before checking for updates; do not delete worlds.
4. Stop/start the server so Foundry reloads installed package metadata, then refresh the Forge/Foundry setup page. Confirm the installed entry is **Kingdom Death: Monster**, ID `kingdom-death`, version `0.1.1`.
5. Open **Create World/New Game** and verify **Kingdom Death: Monster** is available in the game-system selector. Select it, create a fresh test world and launch it. A changed badge alone does not pass this step.
6. Create Survivor/Monster/Settlement Actors, save edits and reload. Complete `docs/runtime-checklist.md`, including permissions and two-client synchronization, before recording runtime success.

If still missing: collect the installed system version/compatibility display, exact configured server build, whether the selector is Forge Game Manager or Foundry Setup, and the first package-load/validation error from browser console or available Forge server logs after restart. If Foundry Setup is available, compare its Game Systems list and Create World selector with Forge's New Game selector. Present in Foundry but absent in Forge would narrow the issue toward Forge discovery/filtering; absent from both suggests package loading. Do not widen compatibility bounds or assert a fix without this evidence.

## Automated coverage

`npm run build` validates source paths, compiles templates, runs Node and Python regressions, and inspects actual ZIP bytes. Checks enforce the exact metadata, version/download correspondence, single package root, identical manifests, required files/imports/templates and no unexpected dependencies. Regression tests intentionally remove verified metadata, misnest the root, alter download versions, omit assets and mismatch manifests. Release workflow downloads its uploaded draft assets and compares them to the build before publishing, then follows the public manifest's download URL. These checks do not emulate Foundry package availability or Forge world creation.
