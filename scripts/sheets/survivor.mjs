import { KDMActorSheet } from "./actor-base.mjs";
import { ATTRIBUTES, LOCATIONS } from "../rules/constants.mjs";
import { gridCells, validateGrid } from "../rules/gear-grid.mjs";
export class SurvivorSheet extends KDMActorSheet {
  static TABS = {primary: {initial: "attributes", tabs: [{id: "attributes", label: "Attributes"}, {id: "gear", label: "Gear"}, {id: "specials", label: "Specials"}]}};
  tabGroups = {primary: "attributes"};
  _draft = new Map();
  static DEFAULT_OPTIONS = {classes: ["kdm-survivor"], position: {width: 900, height: 850},
    actions: {progress: this.progress}};
  static progress(event, target) {
    if (!this.isEditable) return;
    const input = this.element.querySelector(`[name="${target.dataset.path}"]`);
    input.value = Number(input.value) === Number(target.dataset.value) ? Number(target.dataset.value) - 1 : target.dataset.value;
    input.dispatchEvent(new Event("input", {bubbles: true}));
    for (const box of this.element.querySelectorAll(`[data-path="${target.dataset.path}"]`)) box.checked = Number(box.dataset.value) <= Number(input.value);
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const input of this.element.querySelectorAll("[name]")) {
      if (this._draft.has(input.name)) {
        if (input.type === "checkbox") input.checked = this._draft.get(input.name);
        else input.value = this._draft.get(input.name);
      }
    }
    for (const box of this.element.querySelectorAll("[data-path]")) {
      const input = this.element.querySelector(`[name="${box.dataset.path}"]`);
      if (input) box.checked = Number(box.dataset.value) <= Number(input.value);
    }
    const remember = event => {
      const input = event.target;
      if (this.isEditable && input.name) this._draft.set(input.name, input.type === "checkbox" ? input.checked : input.value);
    };
    this.element.addEventListener("input", remember);
    this.element.addEventListener("change", remember);
  }
  async _processSubmitData(event, form, data, options) {
    const draft = new Map(this._draft);
    this._draft.clear();
    try { return await super._processSubmitData(event, form, data, options); }
    catch (error) { for (const [key,value] of draft) if (!this._draft.has(key)) this._draft.set(key,value); throw error; }
  }
  static PARTS = {body: {template: "systems/kingdom-death/templates/survivor.hbs"}};
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const gear = this.actor.items.filter(i => i.type === "gear");
    const track = (path, value, length, milestones) => ({path, value,
      boxes: Array.from({length}, (_, i) => ({value: i + 1, checked: i < value, milestone: milestones.includes(i + 1)}))});
    const owned = type => this.actor.items.contents.filter(i => i.type === type).toSorted((a,b) => a.sort - b.sort).map(i => ({id:i.id,name:i.name}));
    return {...context, active: {[this.tabGroups.primary]: true},
      sexChoices: ["", "M", "F"].map(value => ({value, selected: this.actor.system.sex === value})),
      huntTrack: track("huntXP", this.actor.system.huntXP, 16, [2,6,10,15,16]),
      courageTrack: track("courage", this.actor.system.courage, 9, [3,9]),
      understandingTrack: track("understanding", this.actor.system.understanding, 9, [3,9]),
      proficiencyTrack: track("weaponProficiency.value", this.actor.system.weaponProficiency?.value ?? 0, 8, [3,8]),
      arts: owned("fightingArt"), disorders: owned("disorder"), abilities: owned("ability"),
      attributes: Object.entries(ATTRIBUTES).map(([key,label]) => ({key,label: label.replace(" modifier", ""),value: this.actor.system.attributes[key]})),
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
