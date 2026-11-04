import { SYSTEM_ID } from "../rules/constants.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class CampaignDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {id: "kdm-campaign-picker", classes: ["kingdom-death"], tag: "form",
    window: {title: "Campaign Dashboard"}, position: {width: 460},
    form: {handler: this.submitCampaign, closeOnSubmit: true}};
  static PARTS = {body: {template: "systems/kingdom-death/templates/campaign-picker.hbs"}};
  async _prepareContext() {
    const active = game.settings.get(SYSTEM_ID, "activeSettlement");
    return {isGM: game.user.isGM, settlements: game.actors.filter(a => a.type === "settlement" && a.testUserPermission(game.user, "OBSERVER"))
      .map(a => ({id: a.id, name: a.name, selected: a.id === active})), activeName: game.kingdomDeath.campaign.settlement?.name};
  }
  static async submitCampaign(event, form, formData) {
    if (game.user.isGM) await game.kingdomDeath.campaign.select(formData.object.settlementId);
    game.kingdomDeath.campaign.open();
  }
}
