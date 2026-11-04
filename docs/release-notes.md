# v0.1.3 — Survivor default validation fix

Fixes the reported Survivor Actor creation error by explicitly allowing blank Sex values while retaining empty/M/F choices. Newly added optional Survivor text fields also explicitly allow blank defaults. The shared text helper, existing data paths and stored Survivor values are preserved.

Validated with 29 Node tests and 9 Python tests plus syntax, template, manifest, module-path and ZIP checks. A non-persistent real-model regression macro is provided at tools/runtime/survivor-defaults.js in the repository. Foundry 14.365 runtime execution remains pending; offline tests use API doubles and do not certify runtime validation.

After updating, confirm version 0.1.3, restart/reload Foundry and create a Survivor through the normal Actor dialog.
