import { KDMActorSheet } from "./actor-base.mjs";
import { PHASES, PARTY_SLOTS } from "../rules/constants.mjs";
import { validateCampaign } from "../rules/campaign.mjs";
export class SettlementSheet extends KDMActorSheet {
  static PARTS = {body: {template: "systems/kingdom-death/templates/settlement.hbs"}};
  async _prepareContext(options) {
    const campaign = this.actor.system.campaign;
    const visible = game.actors.filter(a => a.testUserPermission(game.user, "OBSERVER"));
    const choices = (type, selected) => {
      const list = visible.filter(a => a.type === type).map(a => ({id: a.id, name: a.name, selected: a.id === selected}));
      if (selected && !list.some(a => a.id === selected)) list.push({id: selected, name: "Missing or inaccessible actor — clear selection", selected: true});
      return list;
    };
    return {...await super._prepareContext(options),
      phases: PHASES.map(id => ({id, selected: id === campaign.phase})),
      party: PARTY_SLOTS.map((key,i) => ({key, label: `Survivor ${i + 1}`, choices: choices("survivor", campaign.party[key])})),
      quarry: choices("monster", campaign.quarryId),
      isHunt: campaign.phase === "hunt", isShowdown: campaign.phase === "showdown"};
  }
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    validateCampaign(data.system.campaign, game.actors.contents);
    return data;
  }
}
