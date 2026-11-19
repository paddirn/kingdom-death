# v0.1.12 — Settlement records and portrait headers

Settlement adds Timeline and Monsters tabs, a 36-year timeline with independent year and Story Event toggles, ten Milestones, Quarry/Nemesis level records, five Principle references to owned Innovations, Departing Survival Gain, Portcullis Key and twenty Lost Settlement checks. All campaign records remain manual.

Population separates accessible living and dead World Survivors and derives forty read-only death boxes plus the actual count. Innovations and Storage use compact lists. Settlement gains a native Actor portrait, naming reminder and static phase reference. Survivor and Settlement headers share aligned control rows.

New schema fields use safe defaults and stable year/row keys; no destructive migration or startup rewrite is required. Existing campaign assignments, Actor/Item records and Armor accounting are preserved. Principle assignment changes save with the form; external Item copies are created immediately. Replacing or clearing a reference does not delete an Item. Dirty fields and unchecked values survive tab changes and rerenders.

Validation: 123 JavaScript tests, 9 Python packaging tests, syntax/template/manifest/module checks and ZIP validation. Foundry V14 build 365 runtime and visual alignment remain unverified. Back up the world, update through Forge, restart the game and reload clients. Follow docs/settlement-records.md for the full manual checklist. Existing cross-client simultaneous-edit limitations remain.
