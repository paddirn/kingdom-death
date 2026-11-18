import { KDMActorSheet } from './actor-base.mjs';
import { restoreDraft, rememberDraft } from '../ui/drafts.mjs';
import { dropTarget, acceptsItem, oncePerDrop, installDropFeedback } from '../ui/item-drops.mjs';
import { receiveItem } from '../inventory/operations.mjs';
const tabs=[{id:'main',label:'Settlement'},{id:'population',label:'Population'},{id:'locations',label:'Locations'},{id:'settings',label:'Campaign Settings'}];
export class SettlementSheet extends KDMActorSheet {
  static DEFAULT_OPTIONS={classes:['kdm-settlement'],actions:{openSurvivor:this.openSurvivor}};
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
      if(!acceptsItem(target,item,this._canDragDrop())) {ui.notifications.warn('Drop a compatible Item into Storage, Innovations or Locations.');return;}
      try {return await receiveItem(this.actor,item);} catch(error) {ui.notifications.warn(error.message);}
    });
  }
  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    return {...context,tabs:tabs.map(t=>({...t,settings:t.id==='settings',active:this.tabGroups.primary===t.id})),
      active:Object.fromEntries(tabs.map(t=>[t.id,t.id===this.tabGroups.primary])),
      inventory:context.inventory.filter(i=>['gear','armor','resource'].includes(i.itemType)),
      innovations:context.inventory.filter(i=>i.itemType==='innovation'),
      locations:context.inventory.filter(i=>i.itemType==='settlementLocation'),
      population:game.actors.contents.filter(a=>a.type==='survivor' && a.testUserPermission(game.user,'OBSERVER')).map(a=>({id:a.id,name:a.name+(['M','F'].includes(a.system.sex)?` (${a.system.sex})`:'' )})),
      counters:[['lanternYear','Lantern Year'],['population','Population'],['endeavors','Endeavors'],['survivalLimit','Survival Limit']].map(([key,label])=>({key,label,value:this.actor.system[key]}))};
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
    // Hidden phase, party and quarry are not part of this form and are never revalidated or overwritten.
    return foundry.utils.expandObject(Object.fromEntries(Object.entries(foundry.utils.flattenObject(data)).filter(([key])=>this._draft.has(key))));
  }
  async _processSubmitData(event,form,data,options) {
    const draft=new Map(this._draft);this._draft.clear();
    try {return await super._processSubmitData(event,form,data,options);}
    catch(error) {for(const [key,value] of draft) if(!this._draft.has(key)) this._draft.set(key,value);throw error;}
  }
  async _onClose(options) {this._listeners?.abort();this._dropFeedback?.abort();return super._onClose(options);}
}
