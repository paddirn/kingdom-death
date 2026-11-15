# Monster record and setup

Monster sheets have Attributes and Setup tabs with persistent Save. Draft text, image paths, legend labels and cell edits survive tab changes and ordinary rerenders. New records default to an empty Instinct, terrain and aftermath text and 352 gray cells. Rewards uses the existing embedded Item actions. Description uses existing notes.

The setup diagram is a row-major 22 by 16 array. Each integer is a color state from zero to four. Invalid legacy cells become gray, missing cells are filled and excess cells are truncated. Valid positions remain intact. Model validation requires exactly 352 valid integers. All editing is manual.

Level accepts 1–4, movement and toughness 0–99, and speed/damage -99–99. Wounds remains an uncapped nonnegative tally. Existing out-of-range numeric attributes are bounded when loaded and their original numeric text is retained in system.legacyAttributes, accessible under Previous out-of-range attributes. Migration persists on normal saves. Legacy accuracy, luck, evasion, deck references and notes retain their paths.

Grid clicks update one button. Save merges edited indices with the most recently received Actor grid. Only dirty ordinary fields are submitted. Concurrent edits to the same cell use last-write behavior. A stale client can still race another simultaneous save of the array, so coordinate simultaneous diagram edits. These client updates are not database transactions.

## Forge checks for Foundry 14.365

Runtime verification remains pending. Back up the world, install a release containing the feature and restart the Forge game.

1. Open an existing Monster with Items, notes and deck references. Confirm Rewards, Description and both deck UUIDs. Check legacy hidden stats in exported Actor data.
2. Create a Monster. Verify the six stats and their bounds, including signed speed/damage, and an arbitrarily large wound tally. Step and type positive/negative values. Save and reload to confirm integers without a stored plus sign.
3. Enter unsaved text on both tabs. Pick an Instinct image using the native picker and trigger an Item rerender. Confirm drafts and tab survive, then Save and reload. Confirm the Actor avatar remains its own image.
4. Check the diagram has 22 columns and 16 rows at normal and narrow widths. Click a cell five times and operate cells with Tab/Enter/Space. Check accessible row/column/color names and immediate colors.
5. Rename all four legend entries, paint cells, change tabs and trigger a rerender. Save/reload and verify exact positions and labels. Verify Terrain & Deployment and both Aftermath fields with multiline text.
6. Open as Observer and confirm disabled input, grid and image editing. Open a second client, change an unrelated field and save a diagram edit from the first client. Confirm unrelated values persist.
7. Confirm existing Item drops and Add/Edit/Remove work in Rewards. Test an unavailable image path and clear or replace it through the picker.

Offline tests cover rules, schema contracts, templates, dirty-field submission and controller actions. Actual Foundry rendering, form processing and database persistence need these checks.
