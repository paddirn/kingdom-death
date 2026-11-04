import { familyContext } from "../family/context.mjs";
import { updateFamily } from "../family/relationships.mjs";
import { resolveProficiency } from "../rules/proficiency.mjs";
import { pickImage } from "../ui/images.mjs";
import { KDMActorSheet } from "./actor-base.mjs";
import { ATTRIBUTES, LOCATIONS } from "../rules/constants.mjs";
import { gridCells, validateGrid } from "../rules/gear-grid.mjs";
export class SurvivorSheet extends KDMActorSheet {
  static TABS = {primary: {initial: "attributes", tabs: [{id: "attributes", label: "Attributes"}, {id: "gear", label: "Gear"}, {id: "specials", label: "Specials"}, {id:"family",label:"Family"}, {id:"image",label:"Image"}]}};
  tabGroups = {primary: "attributes"};
  _draft = new Map();
  static DEFAULT_OPTIONS = {classes: ["kdm-survivor"], position: {width: 900, height: 850},
    actions: {progress: this.progress, setProficiency: this.setProficiency, clearProficiency: this.clearProficiency,
      openProficiency: this.openProficiency, familyApply: this.familyApply, familyClear: this.familyClear,
      openFamily: this.openFamily, actorImage: function(event,target) { if(this.isEditable) pickImage(this.actor,target.dataset.imagePath); }}};
  static progress(event, target) {
    if (!this.isEditable) return;
    const input = this.element.querySelector(`[name="${target.dataset.path}"]`);
    input.value = Number(input.value) === Number(target.dataset.value) ? Number(target.dataset.value) - 1 : target.dataset.value;
    input.dispatchEvent(new (this.element.ownerDocument?.defaultView?.Event ?? Event)("input", {bubbles: true}));
    for (const box of this.element.querySelectorAll(`[data-path="${target.dataset.path}"]`)) box.checked = Number(box.dataset.value) <= Number(input.value);
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const input of this.element.querySelectorAll("[name]")) {
      if (this._draft.has(input.name)) {
        if (input.type === "radio") input.checked = input.value === this._draft.get(input.name);
        else if (input.type === "checkbox") input.checked = this._draft.get(input.name);
        else input.value = this._draft.get(input.name);
      }
    }
    for (const box of this.element.querySelectorAll("[data-path]")) {
      const input = this.element.querySelector(`[name="${box.dataset.path}"]`);
      if (input) box.checked = Number(box.dataset.value) <= Number(input.value);
    }
    for (const type of ["input", "change"]) this._draftEventRoot?.removeEventListener?.(type, this._rememberDraft);
    const remember = event => {
      const input = event.target;
      if (input.name === "system.sex") this.updateSexBar(input.value);
      if (this.isEditable && input.name && (input.type !== "radio" || input.checked)) this._draft.set(input.name, input.type === "checkbox" ? input.checked : input.value);
    };
    this._draftEventRoot = this.element;
    this._rememberDraft = remember;
    this.element.addEventListener("input", remember);
    this.element.addEventListener("change", remember);
    this.updateSexBar(this.element.querySelector?.('[name="system.sex"]')?.value ?? this.actor.system.sex);
  }
  async _processSubmitData(event, form, data, options) {
    const draft = new Map(this._draft);
    this._draft.clear();
    try {
      if (data.system?.proficiencyUuid && data.system.proficiencyUuid !== this.actor.system.proficiencyUuid) await resolveProficiency(data.system.proficiencyUuid);
      return await super._processSubmitData(event, form, data, options);
    }
    catch (error) { for (const [key,value] of draft) if (!this._draft.has(key)) this._draft.set(key,value); throw error; }
  }
  static PARTS = {body: {template: "systems/kingdom-death/templates/survivor.hbs"}};
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    let proficiency=null;
    const proficiencyUuid=this._draft.get("system.proficiencyUuid") ?? this.actor.system.proficiencyUuid;
    if (proficiencyUuid) { try { proficiency=await resolveProficiency(proficiencyUuid); } catch { /* Show clearable missing reference. */ } }
    const gear = this.actor.items.filter(i => i.type === "gear");
    const track = (path, value, length, milestones) => ({path, value,
      boxes: Array.from({length}, (_, i) => ({value: i + 1, checked: i < value, milestone: milestones.includes(i + 1)}))});
    const owned = type => this.actor.items.contents.filter(i => i.type === type).toSorted((a,b) => a.sort - b.sort).map(i => ({id:i.id,name:i.name}));
    const choiceGroup = (path, entries) => ({path, options: [{value: "", title: "None", description: ""}, ...entries.map(([value,title,description]) => ({value,title,description}))].map(option => ({...option, selected: (this.actor.system[path] ?? "") === option.value}))});
    return {...context, family:familyContext(this.actor,game.actors.contents),
      customTokens:Object.entries(this.actor.system.customTokens ?? {}).map(([key,token])=>({key,...token})),
      proficiencyUuid, proficiencyName:proficiency?.name ?? (proficiencyUuid ? "Missing or inaccessible Proficiency" : "No linked Proficiency"),
      proficiencies:(game.items?.contents ?? []).filter(i=>i.type==="proficiency" && i.testUserPermission(game.user,"OBSERVER")).map(i=>({uuid:i.uuid,name:i.name,selected:i.uuid===proficiencyUuid})),
      survivalActions: ["dodge", "encourage", "surge", "dash", "endure"].map(key => ({key, label: key[0].toUpperCase() + key.slice(1), checked: this.actor.system.survivalActions?.[key] ?? false})),
      courageOptions: choiceGroup("courageChoice", [["stalwart","Stalwart","Can't be knocked down by brain trauma or intimidate."],["prepared","Prepared","Add Hunt XP to your roll when determining a straggler."],["matchmaker","Matchmaker","Spend 1 endeavor to trigger Intimacy story event."]]),
      understandingOptions: choiceGroup("understandingChoice", [["analyze","Analyze","Look at top AI card and return it to the top of the deck."],["explore","Explore","Add +2 to your investigate roll results."],["tinker","Tinker","+1 endeavor when a returning survivor."]]),
      active: {[this.tabGroups.primary]: true},
      sexChoices: ["", "M", "F"].map(value => ({value, label: value === "M" ? "Male" : value === "F" ? "Female" : "Unspecified", selected: this.actor.system.sex === value})),
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
  updateSexBar(value) {
    this.element.querySelector?.('.kdm-sex-bar')?.style.setProperty('--sex-color',value === "M" ? "#a8d8f0" : value === "F" ? "#efacc4" : "#888");
  }
  async linkProficiency(uuid) {
    if (!this.isEditable) return;
    try {
      await resolveProficiency(uuid);
      this._draft.set("system.proficiencyUuid",uuid);
      this.render({force:false});
    } catch(error) { ui.notifications.warn(error.message); }
  }
  static setProficiency(event,target) {
    const selector=target.dataset.source === "select" ? '[data-proficiency-select]' : '[name="system.proficiencyUuid"]';
    return this.linkProficiency(this.element.querySelector(selector).value.trim());
  }
  static clearProficiency() { return this.linkProficiency(""); }
  static async openProficiency() {
    try { (await resolveProficiency(this._draft.get("system.proficiencyUuid") ?? this.actor.system.proficiencyUuid))?.sheet.render({force:true}); }
    catch(error) { ui.notifications.warn(error.message); }
  }
  async _onDropItem(event,item) {
    if (event.target.closest('[data-proficiency-link]')) return this.linkProficiency(item.uuid);
    return super._onDropItem(event,item);
  }
  async _onDropActor(event,actor) {
    const slot=event.target.closest('[data-family-slot]');
    if (slot) return this.changeFamily(slot.dataset.kind,slot.dataset.slot,actor.pack ? "invalid-compendium" : actor.id);
    return super._onDropActor(event,actor);
  }
  async changeFamily(kind,slot,value) {
    if (!this.isEditable) return;
    try { await updateFamily(this.actor,kind,slot,value); }
    catch(error) { ui.notifications.warn(error.message); }
    this.render({force:false});
  }
  static familyApply(event,target) {
    const slot=target.closest('[data-family-slot]');
    return this.changeFamily(slot.dataset.kind,slot.dataset.slot,slot.querySelector('select').value);
  }
  static familyClear(event,target) {
    const slot=target.closest('[data-family-slot]');
    return this.changeFamily(slot.dataset.kind,slot.dataset.slot,"");
  }
  static openFamily(event,target) {
    const actor=game.actors.get(target.dataset.actorId);
    if(actor?.testUserPermission(game.user,"OBSERVER")) actor.sheet.render({force:true});
  }
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    validateGrid(data.system.gearGrid, this.actor.items.contents);
    return data;
  }
}
