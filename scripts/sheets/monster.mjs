import { KDMActorSheet } from "./actor-base.mjs";
import { restoreDraft, rememberDraft } from "../ui/drafts.mjs";
import { COLORS, COLOR_NAMES, cellLabel, cycleCell, mergeCells } from "../rules/monster-setup.mjs";
export class MonsterSheet extends KDMActorSheet {
  static DEFAULT_OPTIONS = {
    classes:["kdm-monster"], position:{width:800,height:850},
    actions:{setupCell:this.setupCell, instinctImage:this.instinctImage}
  };
  static TABS = {primary:{initial:"attributes",tabs:[
    {id:"attributes",label:"Attributes"},{id:"setup",label:"Setup"}
  ]}};
  static PARTS = {body:{template:"systems/kingdom-death/templates/monster.hbs"}};
  tabGroups = {primary:"attributes"};
  _draft = new Map();
  _cellEdits = new Map();
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const legend = this.currentLegend();
    return {...context, legacyAttributes:Object.entries(this.actor.system.legacyAttributes ?? {}).filter(([,value])=>value).map(([key,value])=>({key,value})), active:{[this.tabGroups.primary]:true},
      instinctImage:this._draft.get("system.instinct.image") ?? this.actor.system.instinct?.image,
      stats:[["level","Level"],["movement","Mov"],["toughness","Tgh"],["speed","Spd"],["damage","Dmg"],["wounds","Wnd"]]
        .map(([key,label])=>({key,label,value:this.actor.system[key],signed:["speed","damage"].includes(key)})),
      cells:mergeCells(this.actor.system.showdownSetup?.cells,this._cellEdits).map((value,index)=>
        ({index,value,color:COLORS[value],label:cellLabel(index,value,legend)})),
      legend:COLOR_NAMES.slice(1).map((name,index)=>({
        key:`color${index+1}`,color:COLORS[index+1],value:legend[`color${index+1}`] ?? name
      }))
    };
  }
  currentLegend() {
    const legend = {...this.actor.system.showdownSetup?.legend};
    for(let index=1;index<=4;index++) {
      const key = `color${index}`;
      const path = `system.showdownSetup.legend.${key}`;
      if(this._draft.has(path)) legend[key] = this._draft.get(path);
    }
    return legend;
  }
  static setupCell(event,target) {
    if(!this.isEditable || !this.actor.isOwner) return;
    const index = Number(target.dataset.cellIndex);
    if(!Number.isInteger(index) || index<0 || index>=352) return;
    const value = cycleCell(Number(target.dataset.state));
    this._cellEdits.set(index,value);
    target.dataset.state = String(value);
    target.style.backgroundColor = COLORS[value];
    target.setAttribute("aria-label",cellLabel(index,value,this.currentLegend()));
  }
  static instinctImage() {
    if(!this.isEditable || !this.actor.isOwner) return;
    const Picker = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
    new Picker({type:"image",current:this._draft.get("system.instinct.image") ?? this.actor.system.instinct?.image,
      callback:src=>{
        if(!this.isEditable || !this.actor.isOwner) return;
        this._draft.set("system.instinct.image",src);
        this.render({force:false});
      }}).render({force:true});
  }
  async _onRender(context,options) {
    await super._onRender(context,options);
    restoreDraft(this.element,this._draft);
    this._listeners?.abort();
    this._listeners = new this.element.ownerDocument.defaultView.AbortController();
    const update = event=>{
      if(this.isEditable) rememberDraft(this._draft,event.target);
      this.updateSigns();
      if(event.target.name?.startsWith("system.showdownSetup.legend.")) this.updateCellLabels();
    };
    for(const type of ["input","change"]) this.element.addEventListener(type,update,{signal:this._listeners.signal});
    this.updateSigns();
  }
  updateSigns() {
    for(const input of this.element.querySelectorAll("[data-signed]")) {
      input.closest(".kdm-monster-stat").classList.toggle("positive",Number(input.value)>0);
    }
  }
  updateCellLabels() {
    const legend=this.currentLegend();
    for(const cell of this.element.querySelectorAll("[data-cell-index]")) {
      cell.setAttribute("aria-label",cellLabel(Number(cell.dataset.cellIndex),Number(cell.dataset.state),legend));
    }
  }
  _processFormData(event,form,formData) {
    const data=super._processFormData(event,form,formData);
    if(this._draft.has("system.instinct.image")) {
      data.system.instinct ??= {};
      data.system.instinct.image=this._draft.get("system.instinct.image");
    }
    // Only edited cells are merged with the latest received Actor state on Save.
    if(this._cellEdits.size) {
      data.system.showdownSetup ??= {};
      data.system.showdownSetup.cells=mergeCells(this.actor.system.showdownSetup?.cells,this._cellEdits);
    } else if(data.system.showdownSetup) delete data.system.showdownSetup.cells;
    const flat = foundry.utils.flattenObject(data);
    const changed = Object.fromEntries(Object.entries(flat).filter(([path]) => this._draft.has(path)));
    const result = foundry.utils.expandObject(changed);
    if (this._cellEdits.size) {
      result.system ??= {};
      result.system.showdownSetup ??= {};
      result.system.showdownSetup.cells = data.system.showdownSetup.cells;
    }
    return result;
  }
  async _processSubmitData(event,form,data,options) {
    const draft=new Map(this._draft), cells=new Map(this._cellEdits);
    this._draft.clear(); this._cellEdits.clear();
    try { return await super._processSubmitData(event,form,data,options); }
    catch(error) {
      for(const [key,value] of draft) if(!this._draft.has(key)) this._draft.set(key,value);
      for(const [key,value] of cells) if(!this._cellEdits.has(key)) this._cellEdits.set(key,value);
      throw error;
    }
  }
  async _onClose(options) {
    this._listeners?.abort();
    return super._onClose(options);
  }
}
