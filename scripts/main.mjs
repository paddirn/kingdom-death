import { LivingGlossaryManager } from "./glossary/manager.mjs";
import { LivingGlossaryApplication } from "./glossary/application.mjs";
import { cleanupDeletedGear } from "./inventory/operations.mjs";
import { KDMItem } from "./documents/item.mjs";
import { SYSTEM_ID, LOCATIONS } from "./rules/constants.mjs";
import { SurvivorData } from "./models/survivor.mjs";
import { MonsterData } from "./models/monster.mjs";
import { SettlementData } from "./models/settlement.mjs";
import { itemModels } from "./models/items.mjs";
import { SurvivorSheet } from "./sheets/survivor.mjs";
import { MonsterSheet } from "./sheets/monster.mjs";
import { SettlementSheet } from "./sheets/settlement.mjs";
import { KDMItemSheet } from "./sheets/item.mjs";
import { CampaignController } from "./campaign/controller.mjs";
import { CampaignDashboard } from "./campaign/dashboard.mjs";
Hooks.once("init", () => {
  CONFIG.Item.documentClass = KDMItem;
  Object.assign(CONFIG.Actor.dataModels, {survivor: SurvivorData, monster: MonsterData, settlement: SettlementData});
  Object.assign(CONFIG.Item.dataModels, itemModels);
  const registry = foundry.applications.apps.DocumentSheetConfig;
  for (const [type, cls] of Object.entries({survivor: SurvivorSheet, monster: MonsterSheet, settlement: SettlementSheet})) {
    registry.registerSheet(foundry.documents.Actor, SYSTEM_ID, cls, {types: [type], makeDefault: true, label: `TYPES.Actor.${type}`});
  }
  registry.registerSheet(foundry.documents.Item, SYSTEM_ID, KDMItemSheet, {types: Object.keys(itemModels), makeDefault: true, label: "Kingdom Death: Monster"});
  for (const [key,label] of Object.entries(LOCATIONS)) {
    game.settings.register(SYSTEM_ID, `injuryIcon_${key}`, {
      name: `${label} injury icon`, hint: "Leave empty to use the system icon.",
      scope: "world", config: true, restricted: true, default: "",
      type: new foundry.data.fields.FilePathField({categories:["IMAGE"], blank:true, initial:""}),
      onChange: () => {
        for (const actor of game.actors.contents.filter(actor => actor.type === "survivor")) {
          for (const app of Object.values(actor.apps)) if (app.rendered) app.render({force:false});
        }
      }
    });
  }
  game.settings.register(SYSTEM_ID, "activeSettlement", {scope: "world", config: false, type: String, default: ""});
  game.settings.registerMenu(SYSTEM_ID, "campaign", {name: "Campaign Dashboard", label: "Open Campaign Dashboard",
    hint: "Create a Settlement Actor first. The GM selects the active settlement; participants need Observer access to view it.",
    icon: "fas fa-landmark", type: CampaignDashboard, restricted: false});
  game.settings.registerMenu(SYSTEM_ID, "glossary", {name:"Living Glossary",label:"Open Living Glossary Manager",
    hint:"Sync authorized JSON into native Journal pages. No automatic website retrieval.",icon:"fas fa-book",type:LivingGlossaryApplication,restricted:true});
  game.kingdomDeath = {glossary:new LivingGlossaryManager(),campaign: new CampaignController(), version: game.system.version};
});
Hooks.once("ready", () => {
  if (game.user.isGM && game.version !== "14.365") ui.notifications.warn("Kingdom Death: Monster targets Foundry 14.365 only. This build has not been runtime verified.");
});
// Native document sheets refresh their own Actors and embedded Items. Refresh
// settlement selectors when a world Actor is added, renamed, or removed.
for (const event of ["createActor", "updateActor", "deleteActor"]) Hooks.on(event, actor => {
  for (const settlement of game.actors.filter(a => ["settlement", "survivor"].includes(a.type) && a.id !== actor.id)) {
    for (const app of Object.values(settlement.apps)) if (app.rendered) app.render({force: false});
  }
});

for (const event of ["updateItem", "deleteItem"]) Hooks.on(event, item => {
  if (item.type !== "proficiency") return;
  for (const actor of game.actors.contents) if ((actor.system.proficiencyUuid === item.uuid || actor.system.additionalProficiencies?.includes(item.uuid))) {
    for (const app of Object.values(actor.apps)) if (app.rendered) app.render({force:false});
  }
});

Hooks.on("deleteItem", (item, options, userId) => {
  const actor=item.parent;
  if(userId!==game.user.id || actor?.type!=="survivor" || item.type!=="gear" || !actor.isOwner) return;
  cleanupDeletedGear(actor,item.id).catch(error=>ui.notifications.warn(`Gear cleanup failed: ${error.message}. Clear the missing cell manually.`));
});
