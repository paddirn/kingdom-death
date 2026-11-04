import { KDMActorSheet } from "./actor-base.mjs";
import { ATTRIBUTES, LOCATIONS } from "../rules/constants.mjs";
import { gridCells, validateGrid } from "../rules/gear-grid.mjs";
export class SurvivorSheet extends KDMActorSheet {
  static PARTS = {body: {template: "systems/kingdom-death/templates/survivor.hbs"}};
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const gear = this.actor.items.filter(i => i.type === "gear");
    return {...context,
      attributes: Object.entries(ATTRIBUTES).map(([key,label]) => ({key,label,value: this.actor.system.attributes[key]})),
      locations: Object.entries(LOCATIONS).map(([key,label]) => ({key,label,hasLight: key !== "head", ...this.actor.system.locations[key]})),
      cells: gridCells(this.actor.system.gearGrid, gear).map(cell => ({...cell, number: cell.index + 1,
        choices: gear.map(i => ({id: i.id, name: i.name, selected: i.id === cell.itemId}))}))};
  }
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    validateGrid(data.system.gearGrid, this.actor.items.contents);
    return data;
  }
}
