import { SYSTEM_ID } from "../rules/constants.mjs";
import { validateCampaign } from "../rules/campaign.mjs";
export class CampaignController {
  get settlement() {
    const actor = game.actors.get(game.settings.get(SYSTEM_ID, "activeSettlement"));
    return actor?.type === "settlement" && actor.testUserPermission(game.user, "OBSERVER") ? actor : null;
  }
  async select(id) {
    if (!game.user.isGM) throw new Error("Only a GM can select the active campaign.");
    if (game.actors.get(id)?.type !== "settlement") throw new Error("Choose an existing settlement.");
    await game.settings.set(SYSTEM_ID, "activeSettlement", id);
  }
  async setPhase(phase) {
    const actor = this.settlement;
    if (!actor?.isOwner) throw new Error("Settlement ownership is required to change phase.");
    validateCampaign({...actor.system.toObject().campaign, phase}, game.actors.contents);
    return actor.update({"system.campaign.phase": phase});
  }
  open() {
    const actor = this.settlement;
    if (actor) return actor.sheet.render({force: true});
    ui.notifications.warn("No accessible active settlement. Ask the GM to choose one in Configure Settings → Kingdom Death: Monster → Campaign Dashboard.");
  }
}
