# v0.1.16 — Tile hover rendering fix

Includes merged PR #17. Separates Tile interaction permission checks from native artwork rendering. Tile hover, previews and renderers now see the real layer state. Removes the Tile adapter's forced visibility, render refresh requests and depth changes. CCM and the shared cross-layer adapter are unchanged.

Validation: 158 JavaScript tests, 9 Python packaging tests, syntax/import/template/manifest checks and ZIP inspection. Regression coverage includes background/foreground/transparent Tile rendering contracts, hover/leave, previews, cleanup and independent CCM behavior.

Actual Foundry V14 build 365 mouse behavior and resolution of the reported disappearance remain unverified in the development environment. See [the Tile hover checklist](https://github.com/paddirn/kingdom-death/blob/v0.1.16/docs/tile-hover-fix.md) for runtime checks. Foundry target remains 14.365.

Update through Forge, restart the game and fully reload every client to remove the previous version's instance patches. Check Tile hover, selection, dragging, configuration and right-click controls alongside tokens and CCM cards.
