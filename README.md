# Kingdom Death: Monster for Foundry VTT

Unofficial, content-free foundation for a board-game-oriented system. System ID: `kingdom-death`. Version: **0.1.0**. Target: **Foundry V14 build 365 (14.365)**, hosted on The Forge.

**Runtime verification pending.** Automated checks do not run Foundry. The manifest restricts installation to 14.365 and deliberately omits `compatibility.verified` until a real smoke test passes. Foundry may report this package as unverified; do not mistake the target version for a verified claim.

## Included in milestone 1

- Survivor, Monster, Settlement typed Actor models and ApplicationV2 sheets.
- Seven Item types: Gear, Resource, Fighting Art, Disorder, Ability, Innovation, Settlement Location. Gear and Resource have structured fields; the other five provide basic notes, source, and keywords.
- Survivor attributes, survival/limit, insanity/brain injury, armor/injury boxes, bleeding, basic progression counters, statuses, and a 3×3 gear grid.
- Embedded inventory; editable resource quantities; stored gear affinities and attack profile.
- Settlement campaign controller: lantern year, population, endeavors, departing party, quarry, active phase, placeholder hunt coordinates and Scene reference.
- Native document persistence, ownership controls, and native Cards integration points.

Not included: playable combat, rolls, AI/HL automation, damage calculation, affinity bonuses, crafting, event content, migrations from other systems, or a White Lion pack. No copyrighted artwork, card text, rules passages, or proprietary content is shipped. All notes are plain text and escaped in templates. This is not affiliated with or endorsed by Kingdom Death.

## Install on The Forge (ZIP)

1. Download the built `kingdom-death-0.1.0.zip`. Do not use GitHub's source ZIP if you want the curated package. To reproduce it: Node.js 22+, Python 3, `npm ci`, then `npm run build`. Output is in `dist/`.
2. In Forge **Games Configuration**, stop the intended game/server and select **Foundry V14 build 365** if that build is available to your account. Do not downgrade an existing newer-version world. Create a separate test world. If Forge does not offer 365, that exact target cannot be verified there; ask Forge support before substituting a newer build.
3. Under **Table Tools → Summon Import Wizard**, turn **Install found packages from the Bazaar** off. Select **ZIP file**, choose the built ZIP, then **Analyze** and finish the import. The archive contains one `kingdom-death/` directory with `system.json` directly inside it.
4. Stop/start your Foundry server so it discovers the system. In Foundry Setup, create a new world and select **Kingdom Death: Monster** as its system. Forge Game Manager users can create/select the world through their game configuration instead.
5. Launch as GM with other modules disabled for initial testing. Check the version shown in Foundry is exactly 14.365.

Forge's documented [custom package import workflow](https://forums.forge-vtt.com/t/how-to-upload-a-modified-version-of-a-module-system/10510) is the basis for these instructions. Importing another version of the same system replaces the installed code; back up worlds before future updates. Pushing GitHub code does **not** deploy to Forge.

## First-use smoke test

1. Create one **Settlement**, four **Survivor** Actors and one **Monster** in the Actors directory. Open all three sheet types; confirm no red console errors.
2. Edit a survivor's name, movement, survival, armor, injury boxes, and notes. Click **Save changes**. Close/reopen, then reload the browser; values must remain.
3. On the survivor, **Add gear**, name it `Test gear A`, set an affinity and save its Item sheet. Close it. Repeat for `Test gear B`. Assign the items to slots 1 and 2, then save. Both assignments must survive reload. Try assigning the same item to a second cell; saving must fail with a validation error. Clear the duplicate and save.
4. Delete an assigned item. Its slot must show a missing-reference option; clear that slot and save. Also create a Gear Item in the Items directory and drag it onto the Actor sheet; check that an independent embedded copy is created. World source edits must not change the owned copy.
5. On the settlement, add a Resource, set quantity to 7 on its Item sheet, and save. Set population, lantern year, party, and quarry; save. Duplicate party assignments must be rejected. Change phase to hunt, set coordinates, save; then change to showdown and save. No automated gameplay should occur.
6. In **Configure Settings → Kingdom Death: Monster → Campaign Dashboard**, select the Settlement and open it. A script Macro containing `game.kingdomDeath.campaign.open();` is an optional one-click shortcut; the settings menu remains the no-code entry point.
7. Give a second user **Observer** access to Settlement and **Owner** access to one Survivor through native ownership configuration. In another browser session, verify read-only settlement, editable owned survivor, no editing of others' actors, and persisted updates after both clients reload. Grant Settlement Owner only to players intended to manage campaign state. Active settlement selection remains GM-only.
8. Update a saved record in one client while its sheet is open in the other; the second must refresh. Coordinate editing: simultaneous saves of the same field use Foundry's last-write behavior; no transaction/locking protocol is claimed. Save before inventory actions; an external update may refresh a form with unsaved edits.
9. Create a square-grid Scene and place a survivor and monster token. Create an empty native Cards deck and copy its UUID to the monster's AI field; save/reload. Deck buttons are intentionally disabled placeholders.

Record outcomes in [docs/runtime-checklist.md](docs/runtime-checklist.md). Milestone 1 is a foundation candidate until this checklist passes on the target runtime.

## Development

```sh
npm ci
npm run check
npm run build
```

Node tests cover pure gear/campaign rules, controller permission guards and update payloads, template rendering, schema structure and registration with a minimal API stub. They do **not** establish Foundry data validation, rendering, database or multiplayer compatibility. Validation checks JavaScript syntax, module/template paths, JSON, and manifest invariants. Runtime has no npm dependencies or external network calls.

See [architecture](docs/architecture.md), [decisions](docs/decisions.md), [development plan](docs/development-plan.md), and [release procedure](docs/releases.md). GitHub Actions builds a downloadable artifact on pushes and PRs; it does not publish a release automatically.
