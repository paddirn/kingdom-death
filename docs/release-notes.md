# v0.1.11 — Armor, Settlement tabs and Survivor portrait

Armor Items share equipment affinities and the existing nine-slot gear grid. Persistent contribution tracking separates damageable Survivor protection from permanent Item properties and independent manual armor. Moving equipment does not grant protection twice; unequipping removes its remaining contribution. Existing armor initializes as independent protection on the first normal Actor update.

Settlement now has Settlement, Population, Locations and Campaign Settings tabs, with separate Innovations and Storage sections. Population resolves accessible World Survivors live without replacing the manual total. Hidden campaign phase, party and quarry values are preserved. The Survivor header displays actor.img with native preview and owner-only image selection; prototype-token artwork remains independent.

Manual damage consumes equipment contributions in embedded Item ID order, then independent armor. Manual increases add independent armor. Capacity changes preserve recorded damage. Same-client writes are queued, but simultaneous edits from different clients can still conflict. Coordinate armor/equipment edits; see docs/armor-settlement.md for accounting details, recovery steps and the Forge checklist.

Validation: 114 JavaScript tests, 9 Python packaging tests, syntax/template/manifest/module checks and ZIP validation. Foundry V14 build 365 runtime and visual behavior remain unverified. Back up the world, update through Forge, restart the game and reload clients before testing.
