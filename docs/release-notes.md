# v0.1.8 — Proficiency, Specials and shared keyword tags

Proficiency Items now offer None, Specialist and Master on one horizontal row. Saved names follow Type and Rank, with a safe fallback for blank Type. Existing specialization/mastery ranks map to specialist/master without recreating Items or changing UUIDs.

Survivors gain additional Proficiency links in a separate two-column list, with duplicate prevention, unlinking and missing-reference handling. Primary XP remains; legacy specialist/master Boolean values remain stored but hidden. Specials combines Fighting Arts and Abilities with type labels and moves Skip Next Hunt and Impairments into Disorders. Once Per Lifetime spans both columns.

All Item types use Enter-to-add keyword tags with removal and draft preservation. Source is the last editable field. Legacy nonempty keyword strings become one trimmed tag, preserving punctuation; arrays deduplicate case-insensitively while retaining first spelling/order. Missing fields default to empty arrays. Canonical migration values persist on ordinary Item saves; no destructive bulk rewrite occurs.

Validation: 92 JavaScript tests and 9 Python packaging tests, plus syntax, templates, module paths, manifest and ZIP inspection. Target remains Foundry 14.365. Actual Foundry rendering, migration and save/reload persistence remain runtime-unverified.

Back up the world, update on Forge, restart the game and reload clients. Follow docs/proficiency-keywords.md for migration details and manual checks of old world/embedded Items, ranks/sidebar names, keyword Enter handling, additional links, permissions and persistence. The existing release and installation workflow is retained.
