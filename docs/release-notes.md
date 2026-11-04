# v0.1.6 — Survivor layout and visual gear grid

Replaces dropdown gear assignment with a square image-card grid. World and compendium Gear creates an owned copy; owned Gear moves between cells without duplication. Replacing or clearing a cell keeps displaced Items in Inventory. Confirmed Inventory deletion clears equipped references.

Adds shared Item drop routing and feedback for Gear cells, Inventory, Proficiency and matching Specials. Inventory uses a responsive three-column layout; Specials uses two columns. Proficiency is a compact name-only native document link and drop target.

Refines Attributes with a Hunt XP heading, Retired beside Dead, hidden legacy milestone controls, accessible armor labels, single-line Survival Limit and a Sex-colored header separator. Paired columns align without fixed module heights. Existing data paths, Family and Image functionality remain intact.

Validated with 69 Node and 9 Python tests plus syntax, template, manifest, module-path and ZIP checks. Targets Foundry 14.365 only. Actual Foundry rendering and drag-and-drop remain unverified. Detached-window drag feedback may be unavailable when source dragstart is not observable. Coordinate simultaneous inventory edits; the queue serializes this client's operations only.

After updating, restart/reload Forge and follow docs/survivor-drag-drop.md for manual acceptance checks. Gear and inventory operations save immediately; ordinary fields and Proficiency links use Save Changes.
