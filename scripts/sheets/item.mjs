import { pickImage, previewImage } from "../ui/images.mjs";
import { proficiencyName, keywords } from "../rules/proficiency.mjs";
import { restoreDraft, rememberDraft } from "../ui/drafts.mjs";
import { enhanceNumbers } from "../ui/numbers.mjs";
const { api, sheets } = foundry.applications;
export class KDMItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  _draft = new Map();
  _tags = null;
  static DEFAULT_OPTIONS = {classes: ["kingdom-death", "kdm-sheet"], tag: "form",
    actions: {pickImage: function() { if (this.isEditable) pickImage(this.item); }, previewImage: function() { previewImage(this.item); },
      addKeyword: this.addKeyword, removeKeyword: this.removeKeyword},
    position: {width: 620, height: 750}, form: {submitOnChange: false, closeOnSubmit: false}};
  static PARTS = {body: {template: "systems/kingdom-death/templates/item.hbs"}};
  async _onRender(context, options) {
    await super._onRender(context, options);
    enhanceNumbers(this.element, this.isEditable, this.item.system);
    restoreDraft(this.element, this._draft);
    this._listeners?.abort();
    this._listeners = new this.element.ownerDocument.defaultView.AbortController();
    const signal = this._listeners.signal;
    const change = event => {
      if (!this.isEditable) return;
      rememberDraft(this._draft,event.target);
      if (this.item.type === "proficiency") {
        const type=this.element.querySelector('[name="system.type"]')?.value;
        const rank=this.element.querySelector('[name="system.rank"]:checked')?.value;
        this.element.querySelector('[name="name"]').value=proficiencyName(type,rank);
      }
    };
    if (this.item.type === "proficiency" && this.isEditable) change({target:{}});
    for (const type of ["input","change"]) this.element.addEventListener(type,change,{signal});
    this.element.addEventListener("keydown",event=> {
      if (event.key === "Enter" && event.target.matches('[data-keyword-entry]')) {
        event.preventDefault(); KDMItemSheet.addKeyword.call(this);
      }
    },{signal});
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {...context, item: this.item, system: this.item.system, editable: this.isEditable,
      tags: this._tags ?? this.item.system.keywords,
      isProficiency: this.item.type === "proficiency",
      ranks: ["specialization","mastery"].map(value=>({value,label:value === "mastery" ? "Mastery" : "Specialization",selected:this.item.system.rank === value})),
      isGear: this.item.type === "gear", isResource: this.item.type === "resource",
      sides: this.item.type === "gear" ? Object.entries(this.item.system.affinities).map(([side,color]) => ({side,
        colors: ["none","red","green","blue"].map(value => ({value, selected: value === color}))})) : []};
  }
  static addKeyword() {
    if (!this.isEditable) return;
    const input=this.element.querySelector('[data-keyword-entry]');
    this._tags=keywords([...(this._tags ?? this.item.system.keywords),input.value]);
    this.render({force:false});
  }
  static removeKeyword(event,target) {
    if (!this.isEditable) return;
    this._tags=(this._tags ?? this.item.system.keywords).filter((_,i)=>i!==Number(target.dataset.index));
    this.render({force:false});
  }
  _processFormData(event,form,formData) {
    const data=super._processFormData(event,form,formData);
    if (this.item.type === "proficiency") {
      data.system.keywords=keywords(this._tags ?? this.item.system.keywords);
      data.name=proficiencyName(data.system.type,data.system.rank);
    }
    return data;
  }
  async _processSubmitData(event,form,data,options) {
    const draft=new Map(this._draft), tags=this._tags;
    this._draft.clear(); this._tags=null;
    try { return await super._processSubmitData(event,form,data,options); }
    catch(error) { for(const [key,value] of draft) if (!this._draft.has(key)) this._draft.set(key,value); this._tags ??= tags; throw error; }
  }
}
