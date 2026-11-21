# v0.1.14 — Simultaneous CCM pointer adapter

Replaces the Alt+C temporary-layer workaround with an instance-scoped adapter intended to let CCM cards receive native pointer interactions while Tokens remain active. Keeps CCM handlers, control and preview collections, deck drawing and region allocation. No hotkey, temporary layer switch or card-data migration is introduced.

PR #15 is merged. Published at the project owner's request; actual Foundry V14 build 365 mouse acceptance remains unverified. Offline tests do not establish end-to-end card interaction, permissions, deck draws or Allocate Card behavior. See [the integration checklist](ccm-integration.md) for runtime testing and known assumptions.

Validation: 129 JavaScript tests, 9 Python packaging tests, syntax/import/template/manifest checks and ZIP inspection. Foundry target remains 14.365. Update the system through Forge, restart the game and reload all clients. The client setting Enable CCM Interaction on Token Layer controls the optional integration; CCM is not required to run the system.
