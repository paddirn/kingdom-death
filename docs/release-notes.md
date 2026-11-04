# v0.1.7 — Survivor drop repair and Living Glossary

Repairs a drag-feedback veto that could suppress unresolved external Item drops and explicitly connects the native V14 drag/drop controller. Preserves inventory/grid operations and Family routing, with single-event handling and visible invalid-drop feedback.

Moves Save Changes into the persistent Survivor header, arranges Hunt XP as 10+6 boxes and enlarges read-only progression totals. Adds live Survival clamping, submission normalization and model cleaning/joint validation for zero ≤ Current ≤ Limit.

Adds a GM-only Living Glossary manager under Configure Settings. Import authorized normalized JSON into native Journal pages, with stable IDs, incremental updates/renames, preserved manual pages, concurrent-sync guards and partial-failure reports. Includes an original sample and schema, not copyrighted glossary content. Live website scraping is not enabled because source permission for a persistent mirror was not established.

Validation: 85 JavaScript tests and 9 Python packaging tests, plus syntax, module paths, templates, manifest and ZIP inspection. Targets Foundry 14.365 only. Actual Foundry rendering, native drag delivery and reload persistence remain unverified. Published V14 docs currently describe 14.370; no newer target is introduced.

After updating on Forge, restart the game and reload clients. Follow docs/survivor-drag-drop.md for exact runtime tests and docs/living-glossary.md for import instructions. Back up your world first. Client-side operation queues and glossary sync guards are not server transactions across disconnected devices.
