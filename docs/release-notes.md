# v0.1.10 — Monster record and showdown setup

Monster sheets now have Attributes and Setup tabs. Attributes provides six stat controls, a separate Instinct image and description, deck references, Rewards and Description. Setup adds an editable 22×16 five-color diagram, four legend labels, terrain deployment, and victory/defeat aftermath notes.

Existing records and embedded Items are retained. Out-of-range legacy numeric attributes are bounded to the new constraints and their original values retained in a readable legacy section. Malformed diagram data is normalized; saves merge locally edited cells into current Actor data and submit only changed form fields. Simultaneous changes to the same cell remain last-write-wins; coordinate concurrent editing as described in docs/monster-setup.md.

Validation: 101 JavaScript tests, 9 Python packaging tests, syntax/template/manifest checks and ZIP validation. Foundry V14 build 365 runtime and visual behavior have not been verified. After updating on Forge, restart the game and reload clients. Follow docs/monster-setup.md to test permissions, image selection, tabs, numeric controls, grid edits and persistence in the running target build. Back up the world before updating.
