# Survivor records and Item sheets

Impairment flags, Cannot use Abilities, Overcharge and Embolden are manual Boolean records. Severe injury boxes store independent Boolean values in an array per location and injury type. Labels and instance counts come from scripts/rules/injury-records.mjs. New fields default to unchecked. Legacy impairment text and legacy Proficiency notes remain accessible when present. Inventory filters its displayed Items by subtype.

## Verify in Forge on Foundry 14.365

Use a backed-up world and a release containing these changes. This checklist requires the actual Foundry client.

1. Open an existing Survivor with armor, Light/Heavy injuries and legacy impairment notes. Verify those records and the read-only legacy notes, then create a new Survivor and confirm all new boxes start unchecked.
2. Mark Contracture instances 2 and 5 while leaving the others blank. Mark an impairment, Cannot use Abilities, Overcharge and Embolden. Change tabs, cause an Item rerender, save, reload the browser and inspect from another client. Confirm the exact boxes and old armor values persist. As Observer verify controls cannot write.
3. Check the six attribute captions, Hunt XP text, Courage and Understanding alignment and the full-width Armor & Injuries rows at 900px and at narrower widths. Inspect each location's number of boxes.
4. As GM, open Configure Settings → Kingdom Death: Monster. Pick a Forge image for Head, leave the other four blank and save. Check the open sheet on both clients, reload, then clear the setting and confirm the fallback. Verify player accounts cannot modify these world settings.
5. Check Gear inventory only shows Gear and Resources. Drag an owned Gear card into a grid cell, open its sheet and remove it. Confirm other embedded Items still appear under Specials. Check Proficiency drops, Family and Image tabs.
6. For Gear and Proficiency, check the Name/Keywords row, tag entry/removal, Type/Rank and preview. Preview should open one Foundry image window. Test each affinity color, save, reopen and repeat after an unrelated rerender. Type and step Accuracy; only a number should persist. Check notes/description and Source before and after reload.
