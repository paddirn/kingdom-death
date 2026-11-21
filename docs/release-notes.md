# v0.1.15 — Tile interaction and Monster movement range

Includes merged PR #16. Adds independently configurable Tile interaction alongside Tokens and CCM cards, using the shared instance-scoped layer adapter. Native handlers, locks and permissions remain in use; no layer-switching shortcut is introduced.

Monster token HUDs gain Show Movement Range, with an optional configurable shortcut and adjustable opacity. The local preview uses orthogonal full-footprint searches, scene bounds, token obstacles and native collision checks. It updates when relevant documents change and creates no permanent Scene geometry.

Supported geometry: square grids, aligned integer footprints and Movement 0–99. Player previews use visible information and ignore hidden tokens to avoid disclosing their locations. Full-body collision probes are conservative around one-way walls. See [canvas tools](https://github.com/paddirn/kingdom-death/blob/v0.1.15/docs/canvas-tools.md) for limitations and the runtime acceptance checklist.

Validation: 153 JavaScript tests, 9 Python packaging tests, syntax/import/template/manifest checks and ZIP inspection. Actual Foundry V14 build 365 mouse interactions and visual appearance remain unverified in the development environment. Foundry target remains 14.365; no dependency on CCM is required to run the system.

Update the system through Forge, restart the game and reload all clients. Enable Tile Interaction on Token Layer and Enable CCM Interaction on Token Layer operate independently. Right-click a Monster token to access Show Movement Range.
