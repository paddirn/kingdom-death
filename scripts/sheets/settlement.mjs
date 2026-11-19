import { YEARS, MILESTONES, MONSTERS, PRINCIPLES, FLOW, rowKeys, storyState, populationRecords, principleRecord, recordControl } from '../rules/settlement-records.mjs';
import {pickImage, previewImage} from '../ui/images.mjs';
import { KDMActorSheet } from './actor-base.mjs';
import { restoreDraft, rememberDraft } from '../ui/drafts.mjs';
import { dropTarget, acceptsItem, oncePerDrop, installDropFeedback } from '../ui/item-drops.mjs';
import { receiveItem } from '../inventory/operations.mjs';
const tabs=[{id:'main',label:'Settlement'},{id:'population',label:'Population'},{id:'timeline',label:'Timeline'},{id:'locations',label:'Locations'},{id:'monsters',label:'Monsters'},{id:'settings',label:'Campaign Settings'}];
export class SettlementSheet extends KDMActorSheet {
  static DEFAULT_OPTIONS={classes:['kdm-settlement'],actions:{openSurvivor:this.openSurvivor,recordToggle:this.recordToggle,clearPrinciple:this.clearPrinciple,
    portraitPreview:function(){previewImage(this.actor);},portraitChange:function(){if(this.isEditable) pickImage(this.actor);}}};
  static TABS={primary:{initial:'main',tabs}};
  static PARTS={body:{template:'systems/kingdom-death/templates/settlement.hbs'}};
  tabGroups={primary:'main'};
  _draft=new Map();
  get _dragDrop() {
    return this._kdmDragDrop ??= new foundry.applications.ux.DragDrop({dragSelector:'.draggable[data-item-id]',dropSelector:null,
      permissions:{dragstart:this._canDragStart.bind(this),drop:this._canDragDrop.bind(this)},
      callbacks:{dragstart:this._onDragStart.bind(this),dragover:this._onDragOver.bind(this),drop:this._onDrop.bind(this)}});
  }
  _canDragDrop() {return this.isEditable && this.actor.isOwner;}
  _canDragStart() {return this._canDragDrop();}
  async _onDropItem(event,item) {
    return oncePerDrop(event,async()=>{
      const target=dropTarget(event.target);
      if(!acceptsItem(target,item,this._canDragDrop())) {ui.notifications.warn('Drop a compatible Item into Principles, Storage, Innovations or Locations.');return;}
      try {
        if(target.dataset.kdmDrop==='principle' && !Object.hasOwn(PRINCIPLES,target.dataset.principle)) return;
        const owned=await receiveItem(this.actor,item);
        if(target.dataset.kdmDrop==='principle') {
          this._draft.set(`system.principles.${target.dataset.principle}`,owned.id);
          this.render({force:false});
        }
        return owned;
      } catch(error) {ui.notifications.warn(error.message);}
    });
  }
  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    const system=this.actor.system;
    const population=populationRecords(game.actors.contents,game.user);
    return {...context,...population,flow:FLOW,
      principles:Object.keys(PRINCIPLES).map(key=>principleRecord(key,this._draft.get(`system.principles.${key}`) ?? system.principles?.[key] ?? '',this.actor.items.contents,game.user)),
      timeline:YEARS.map((key,i)=>{const row=system.timeline?.[key] ?? {};const state=this._draft.get(`system.timeline.${key}.storyState`) ?? row.storyState ?? 0;return {key,year:i+1,...row,active:this._draft.get(`system.timeline.${key}.active`) ?? row.active ?? false,storyState:state,hasSwords:state===1,hasBook:state>0,storyLabel:['Blank','Crossed swords and book','Book'][state]};}),
      milestones:rowKeys(10).map((key,i)=>({key,custom:i>=5,label:MILESTONES[i] ?? system.milestones?.[key]?.label ?? '',checked:system.milestones?.[key]?.checked ?? false})),
      monsterGroups:Object.entries(MONSTERS).map(([group,names])=>({group,title:group==='quarry'?'Quarry':'Nemesis',rows:rowKeys(10).map((key,i)=>({key,group,custom:i>=3,name:names[i] ?? system.monsterTracking?.[group]?.[key]?.name ?? '',enabled:system.monsterTracking?.[group]?.[key]?.enabled ?? false,levels:[1,2,3].map(n=>{const path=`system.monsterTracking.${group}.${key}.levels.level${n}`;return {number:n,path,active:this._draft.get(path) ?? system.monsterTracking?.[group]?.[key]?.levels?.[`level${n}`] ?? false};})}))})),
      lostSettlements:rowKeys(20).map((key,i)=>({key,number:i+1,checked:system.lostSettlements?.[key] ?? false,emphasized:(i+1)%5===0})),
      tabs:tabs.map(t=>({...t,settings:t.id==='settings',active:this.tabGroups.primary===t.id})),
      active:Object.fromEntries(tabs.map(t=>[t.id,t.id===this.tabGroups.primary])),
      inventory:context.inventory.filter(i=>['gear','armor','resource'].includes(i.itemType)),
      innovations:context.inventory.filter(i=>i.itemType==='innovation'),
      locations:context.inventory.filter(i=>i.itemType==='settlementLocation'),
      population:[...population.living,...population.dead],
      counters:[['lanternYear','Lantern Year'],['population','Population'],['endeavors','Endeavors'],['survivalLimit','Survival Limit'],['departingSurvivalGain','Departing Survival Gain']].map(([key,label])=>({key,label,value:this.actor.system[key]}))};
  }
  static recordToggle(event,target) {
    if(!this.isEditable || !this.actor.isOwner) return;
    const path=target.dataset.path,control=recordControl(path);
    if(!control) return;
    const current=this._draft.has(path)?this._draft.get(path):foundry.utils.getProperty(this.actor,path);
    const value=control==='story'?storyState(current ?? 0):!current;
    this._draft.set(path,value);
    // Update just this button, preserving table scroll and keyboard focus.
    if(control==='toggle') {
      target.classList.toggle('active',value);target.setAttribute('aria-pressed',String(value));
    } else {
      const label=['Blank','Crossed swords and book','Book'][value];
      target.setAttribute('aria-label',`Year ${path.match(/year(\d+)/)[1]} Story Events: ${label}`);
      target.title=`${label}; click to cycle`;
      const icons=(value===1?['fa-swords','fa-book']:value===2?['fa-book']:[]).map(icon=>{
        const element=target.ownerDocument.createElement('i');element.className=`fas ${icon}`;element.setAttribute('aria-hidden','true');return element;
      });
      target.replaceChildren(...icons);
    }
  }
  static clearPrinciple(event,target) {
    if(!this.isEditable || !this.actor.isOwner || !Object.hasOwn(PRINCIPLES,target.dataset.principle)) return;
    this._draft.set(`system.principles.${target.dataset.principle}`,'');this.render({force:false});
  }
  static openSurvivor(event,target) {
    const actor=game.actors.get(target.dataset.actorId);
    if(actor?.type==='survivor' && actor.testUserPermission(game.user,'OBSERVER')) actor.sheet.render({force:true});
  }
  async _onRender(context,options) {
    await super._onRender(context,options);restoreDraft(this.element,this._draft);
    this._listeners?.abort();this._listeners=new this.element.ownerDocument.defaultView.AbortController();
    for(const event of ['input','change']) this.element.addEventListener(event,e=>{if(this.isEditable) rememberDraft(this._draft,e.target);},{signal:this._listeners.signal});
    installDropFeedback(this);
  }
  _processFormData(event,form,formData) {
    const data=super._processFormData(event,form,formData);
    const flat=foundry.utils.flattenObject(data);
    // Drafts also contain button states and fields from tabs omitted by a partial form render.
    return foundry.utils.expandObject(Object.fromEntries([...this._draft].map(([key,value])=>[key,Object.hasOwn(flat,key)?flat[key]:value])));
  }

  async _processSubmitData(event,form,data,options) {
    const draft=new Map(this._draft);this._draft.clear();
    try {return await super._processSubmitData(event,form,data,options);}
    catch(error) {for(const [key,value] of draft) if(!this._draft.has(key)) this._draft.set(key,value);throw error;}
  }
  async _onClose(options) {this._listeners?.abort();this._dropFeedback?.abort();return super._onClose(options);}
}
