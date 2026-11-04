import { KDMActorSheet } from "./actor-base.mjs";
export class MonsterSheet extends KDMActorSheet {
  static PARTS = {body: {template: "systems/kingdom-death/templates/monster.hbs"}};
  async _prepareContext(options) {
    return {...await super._prepareContext(options), stats: ["level","movement","toughness","wounds","accuracy","damage","speed","luck","evasion"]
      .map(key => ({key, value: this.actor.system[key]}))};
  }
}
