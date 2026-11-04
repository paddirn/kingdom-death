# v0.1.2 — Survivor sheet redesign

Adds Attributes, Gear and Specials tabs with a persistent survivor name header. Attributes follows the supplied printed-sheet organization with six stat boxes, injury rows and manual progression tracks. Gear preserves existing assignment and inventory behavior. Specials manages embedded Fighting Arts, Disorders and Abilities with the requested flags and notes.

Adds defaulted Survivor fields while preserving existing data paths and embedded Item references. Draft text and checkbox changes are retained through sheet rerenders and cleared on successful Save.

Validated with 28 Node tests and 9 Python tests plus syntax, template, manifest, module-path and ZIP checks. Targets Foundry 14.365 only. Foundry/Forge runtime and visual verification remain pending. See docs/survivor-sheet.md for acceptance checks.
