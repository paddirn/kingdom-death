import { severeInjuries, impairments, captions, labelParts } from "../rules/injury-records.mjs";
import { clampSurvival } from "../rules/survival.mjs";
import { bindSurvival } from "../ui/survival.mjs";
import { receiveItem, clearGear, deleteInventoryItem } from "../inventory/operations.mjs";
import { dropTarget, acceptsItem, oncePerDrop, installDropFeedback } from "../ui/item-drops.mjs";
import { familyContext } from "../family/context.mjs";
import { updateFamily } from "../family/relationships.mjs";
import { resolveProficiency } from "../rules/proficiency.mjs";
import { pickImage } from "../ui/images.mjs";
import { KDMActorSheet } from "./actor-base.mjs";
import { ATTRIBUTES, LOCATIONS } from "../rules/constants.mjs";
import { gridCells, validateGrid } from "../rules/gear-grid.mjs";
export class SurvivorSheet extends KDMActorSheet {
  static TABS = {primary: {initial: "attributes", tabs: [{id: "attributes", label: "Attributes"}, {id: "gear", label: "Gear"}, {id: "specials", label: "Specials"}, {id:"family",label:"Family"}, {id:"image",label:"Image"}]}};
  // ActorSheetV2 binds this cached controller during its native render lifecycle.
  // One root drop target covers Items, UUID links and Family Actors without nested bindings.
  get _dragDrop() {
    return this._kdmDragDrop ??= new foundry.applications.ux.DragDrop({
      dragSelector: ".draggable[data-item-id]", dropSelector: null,
      permissions: {dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this)},
      callbacks: {dragstart: this._onDragStart.bind(this), dragover: this._onDragOver.bind(this), drop: this._onDrop.bind(this)}
    });
  }
  _canDragDrop() { return this.isEditable && this.actor.isOwner; }
  _canDragStart() { return this.isEditable && this.actor.isOwner; }
  _dropEvents = new WeakMap();
  tabGroups = {primary: "attributes"};
  _draft = new Map();
  static DEFAULT_OPTIONS = {classes: ["kdm-survivor"], position: {width: 900, height: 850},
    actions: {unlinkProficiency: this.unlinkProficiency, progress: this.progress, clearGear: this.clearGear, deleteItem: this.deleteItem,
      familyApply: this.familyApply, familyClear: this.familyClear,
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
    bindSurvival(this.element, this.isEditable, message => ui.notifications.info(message));
    installDropFeedback(this);
    this.updateSexBar(this.element.querySelector?.('[name="system.sex"]')?.value ?? this.actor.system.sex);
  }
  async _processSubmitData(event, form, data, options) {
    const draft = new Map(this._draft);
    this._draft.clear();
    try {
      if (data.system?.proficiencyUuid && data.system.proficiencyUuid !== this.actor.system.proficiencyUuid) await resolveProficiency(data.system.proficiencyUuid);
      for(const uuid of data.system?.additionalProficiencies ?? []) {
        if(!(this.actor.system.additionalProficiencies ?? []).includes(uuid)) await resolveProficiency(uuid);
      }
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
    const additionalProficiencies=await Promise.all((this._draft.get('system.additionalProficiencies') ?? this.actor.system.additionalProficiencies ?? []).map(async uuid=>{
      try {const item=await resolveProficiency(uuid);return {uuid,name:item.name,available:true};}
      catch {return {uuid,name:'Missing or inaccessible Proficiency',available:false};}
    }));
    return {...context, inventory: context.inventory.filter(item=>['gear','resource'].includes(item.itemType)),
      impairments: Object.entries(impairments).map(([key,label])=>({key,parts:labelParts(label),checked:this.actor.system.impairmentFlags?.[key]})),
      additionalProficiencies, specials:[...owned('fightingArt').map(i=>({...i,label:'fighting art'})),...owned('ability').map(i=>({...i,label:'ability'}))], family:familyContext(this.actor,game.actors.contents),
      customTokens:Object.entries(this.actor.system.customTokens ?? {}).map(([key,token])=>({key,...token})),
      proficiencyUuid, proficiencyAvailable:!!proficiency, proficiencyName:proficiency?.name ?? (proficiencyUuid ? "Missing or inaccessible Proficiency" : "No linked Proficiency"),
      survivalActions: ["dodge", "encourage", "surge", "dash", "endure", "overcharge", "embolden"].map(key => ({key, label: key[0].toUpperCase() + key.slice(1), checked: this.actor.system.survivalActions?.[key] ?? false})),
      courageOptions: choiceGroup("courageChoice", [["stalwart","Stalwart","Can't be knocked down by brain trauma or intimidate."],["prepared","Prepared","Add Hunt XP to your roll when determining a straggler."],["matchmaker","Matchmaker","Spend 1 endeavor to trigger Intimacy story event."]]),
      understandingOptions: choiceGroup("understandingChoice", [["analyze","Analyze","Look at top AI card and return it to the top of the deck."],["explore","Explore","Add +2 to your investigate roll results."],["tinker","Tinker","+1 endeavor when a returning survivor."]]),
      active: {[this.tabGroups.primary]: true},
      sexChoices: ["", "M", "F"].map(value => ({value, label: value === "M" ? "Male" : value === "F" ? "Female" : "Unspecified", selected: this.actor.system.sex === value})),
      huntTrack: track("huntXP", this.actor.system.huntXP, 16, [2,6,10,15,16]),
      courageTrack: track("courage", this.actor.system.courage, 9, [3,9]),
      understandingTrack: track("understanding", this.actor.system.understanding, 9, [3,9]),
      proficiencyTrack: track("weaponProficiency.value", this.actor.system.weaponProficiency?.value ?? 0, 8, [3,8]),
      arts: owned("fightingArt"), disorders: owned("disorder"), abilities: owned("ability"),
      attributes: Object.entries(ATTRIBUTES).map(([key,label]) => ({key,caption:labelParts(captions[key]),label: label.replace(" modifier", ""),value: this.actor.system.attributes[key]})),
      locations: Object.entries(LOCATIONS).map(([key,label]) => ({key,label,icon:game.settings.get("kingdom-death", `injuryIcon_${key}`),hasLight: key !== "head", ...this.actor.system.locations[key],
        injuries: severeInjuries[key].map(([id,title,count])=>({title,boxes:Array.from({length:count},(_,i)=>({
          name:`system.severeInjuries.${key}.${id}.${i}`,label:`${label}: ${title} ${i+1} of ${count}`,checked:this.actor.system.severeInjuries?.[key]?.[id]?.[i] ?? false
        }))}))})),
      cells: gridCells(this.actor.system.gearGrid, gear)};
  }
  updateSexBar(value) {
    this.element.querySelector?.('.kdm-survivor-header')?.style.setProperty('--sex-color',value === "M" ? "#a8d8f0" : value === "F" ? "#efacc4" : "#888");
  }
  async linkProficiency(uuid) {
    if (!this.isEditable) return;
    try {
      await resolveProficiency(uuid);
      this._draft.set("system.proficiencyUuid",uuid);
      this.render({force:false});
    } catch(error) { ui.notifications.warn(error.message); }
  }
  async _onDropItem(event,item) {
    const target=dropTarget(event.target);
    if(!target) return super._onDropItem(event,item);
    return oncePerDrop(event,async()=>{
      this._clearDropFeedback?.();
      if(!this.isEditable) return;
      if(!acceptsItem(target,item,true)) {ui.notifications.warn("This target does not accept that Item type.");return;}
      try {
        if(target.dataset.kdmDrop === "additionalProficiency") {
          await resolveProficiency(item.uuid);
          const values=this._draft.get('system.additionalProficiencies') ?? this.actor.system.additionalProficiencies ?? [];
          this._draft.set('system.additionalProficiencies',[...new Set([...values,item.uuid])]);
          return this.render({force:false});
        }
        if(target.dataset.kdmDrop === "proficiency") return await this.linkProficiency(item.uuid);
        return await receiveItem(this.actor,item,target.dataset.kdmDrop === "gear" ? target.dataset.slot : null);
      } catch(error) {ui.notifications.warn(error.message);}
    });
  }
  _onDrop(event) {
    // Native controller owns drop delivery. Feedback listeners never dispatch a second drop.
    if(!this._dropEvents.has(event)) this._dropEvents.set(event,this._handleSurvivorDrop(event));
    return this._dropEvents.get(event);
  }
  async _handleSurvivorDrop(event) {
    try {
      if(!this._canDragDrop()) return;
      const data=foundry.applications.ux.TextEditor.getDragEventData(event);
      if(!data.type) {
        const raw=event.dataTransfer?.getData("text/plain")?.trim() ?? "";
        const uuid=raw.match(/^@UUID\[([^\]]+)\](?:\{[^}]*\})?$/)?.[1] ?? raw;
        const document=uuid ? await fromUuid(uuid) : null;
        if(document?.documentName==="Item") return await this._onDropItem(event,document);
        if(document?.documentName==="Actor" && !dropTarget(event.target)) return await this._onDropActor(event,document);
        throw new Error("Drop an accessible Foundry Item or Survivor Actor reference.");
      }
      if(dropTarget(event.target) && data.type!=="Item") throw new Error("Drop an Item on this target.");
      return await super._onDrop(event);
    } catch(error) {ui.notifications.warn(`Drop failed: ${error.message}`);}
    finally { this._clearDropFeedback?.(); }
  }
  static unlinkProficiency(event,target) {
    if(!this.isEditable) return;
    const values=this._draft.get('system.additionalProficiencies') ?? this.actor.system.additionalProficiencies ?? [];
    this._draft.set('system.additionalProficiencies',values.filter(uuid=>uuid!==target.dataset.uuid));
    this.render({force:false});
  }
  static async clearGear(event,target) {
    if(!this.isEditable) return;
    try { await clearGear(this.actor,target.dataset.slot); }
    catch(error) {ui.notifications.warn(error.message);}
  }
  static async deleteItem(event,target) {
    if(!this.isEditable) return;
    const item=this.actor.items.get(target.dataset.itemId);if(!item) return;
    const yes=await foundry.applications.api.DialogV2.confirm({window:{title:"Remove item"},content:"<p>Delete this embedded item permanently? A world-directory source item, if any, is unaffected.</p>"});
    if(yes) try {await deleteInventoryItem(this.actor,item.id);} catch(error) {ui.notifications.warn(error.message);}
  }
  async _onClose(options) {
    this._dropFeedback?.abort();
    return super._onClose(options);
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
    // Form expansion may represent indexed checkbox paths as an object. Save dense Boolean arrays.
    for (const [location,records] of Object.entries(severeInjuries)) {
      for (const [key,,count] of records) {
        const group=data.system.severeInjuries?.[location];
        if (group?.[key]) group[key]=Array.from({length:count},(_,i)=>group[key][i]===true);
      }
    }
    // Grid assignments save immediately. Do not submit an old hidden copy over a newer drop.
    const grid=this.actor.system?.gearGrid ?? data.system.gearGrid;
    validateGrid(grid, this.actor.items.contents);
    delete data.system.gearGrid;
    if(this._draft.has("system.additionalProficiencies")) data.system.additionalProficiencies=[...new Set(this._draft.get("system.additionalProficiencies"))];
    if(this._draft.has("system.proficiencyUuid")) data.system.proficiencyUuid=this._draft.get("system.proficiencyUuid");
    if (data.system.survival) {
      const proposed = {...this.actor.system?.survival, ...data.system.survival};
      data.system.survival = clampSurvival(proposed);
      if (Number(proposed.value) !== data.system.survival.value || Number(proposed.limit) !== data.system.survival.limit) {
        ui.notifications.info(`Survival corrected to ${data.system.survival.value}; limit ${data.system.survival.limit}.`);
      }
    }
    return data;
  }
}
