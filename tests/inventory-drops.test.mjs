import test from 'node:test';
import assert from 'node:assert/strict';
import {assignGear,receiveItem,clearGear,deleteInventoryItem,cleanupDeletedGear} from '../scripts/inventory/operations.mjs';
import {acceptsItem,dropTarget,oncePerDrop,installDropFeedback} from '../scripts/ui/item-drops.mjs';
const grid=()=>Object.fromEntries(Array.from({length:9},(_,i)=>[`slot${i}`,'']));
function fixture() {
  const contents=[];let created=0;
  const actor={uuid:'Actor.a',isOwner:true,system:{gearGrid:grid()},items:{contents,get:id=>contents.find(i=>i.id===id)},
    async createEmbeddedDocuments(type,records) {
      return records.map(data=>{
        const item={...data,id:`owned${++created}`,documentName:'Item',parent:actor,
          async delete(){if(actor.cancelDelete) return;contents.splice(contents.indexOf(item),1);}};
        contents.push(item);return item;
      });
    },
    async update(data) {
      if(actor.failUpdate) throw Error('update failed');if(actor.cancelUpdate) return;
      for(const [key,value] of Object.entries(data)) {
        if(key==='system.gearGrid') actor.system.gearGrid={...value};
        else actor.system.gearGrid[key.split('.').at(-1)]=value;
      }
    }};
  const source=(type='gear',pack=null)=>({id:'source',documentName:'Item',type,pack,testUserPermission:()=>true,toObject:()=>({_id:'source',type,name:'Source',img:'gear.png',system:{}})});
  globalThis.game={user:{}};
  return {actor,source,created:()=>created};
}
test('world and compendium gear create one embedded copy then equip exact target',async()=>{
  for(const pack of [null,'example.gear']) {
    const f=fixture();const item=await receiveItem(f.actor,f.source('gear',pack),'slot4');
    assert.equal(f.created(),1);assert.equal(f.actor.system.gearGrid.slot4,item.id);assert.equal(item.img,'gear.png');assert.notEqual(item.id,'source');
  }
});
test('owned gear moves, replaces occupied assignment, and clears without deleting copies',async()=>{
  const {actor,source,created}=fixture();const first=await receiveItem(actor,source(),'slot0'),second=await receiveItem(actor,source(),'slot1');
  await receiveItem(actor,first,'slot1');assert.equal(created(),2);assert.equal(actor.system.gearGrid.slot0,'');assert.equal(actor.system.gearGrid.slot1,first.id);assert.ok(actor.items.get(second.id));
  await clearGear(actor,'slot1');assert.equal(actor.system.gearGrid.slot1,'');assert.equal(actor.items.contents.length,2);
});
test('deleting inventory gear clears its slot; cancelled deletion restores assignments',async()=>{
  const {actor,source}=fixture();const item=await receiveItem(actor,source(),'slot8');
  actor.cancelDelete=true;await assert.rejects(deleteInventoryItem(actor,item.id),/cancelled/);assert.equal(actor.system.gearGrid.slot8,item.id);
  actor.cancelDelete=false;await deleteInventoryItem(actor,item.id);assert.equal(actor.system.gearGrid.slot8,'');assert.equal(actor.items.get(item.id),undefined);
});
test('cleanup cancellation prevents deletion, failed assignment retains a recoverable inventory copy',async()=>{
  const {actor,source}=fixture();const item=await receiveItem(actor,source(),'slot0');actor.cancelUpdate=true;
  await assert.rejects(deleteInventoryItem(actor,item.id),/cleanup was cancelled/);assert.ok(actor.items.get(item.id));
  actor.cancelUpdate=false;actor.failUpdate=true;await assert.rejects(receiveItem(actor,source(),'slot1'),/update failed/);assert.equal(actor.items.contents.length,2);assert.equal(actor.system.gearGrid.slot1,'');
});
test('missing legacy slots can be cleared individually and external deletions cleaned',async()=>{
  const {actor}=fixture();actor.system.gearGrid.slot0='gone';actor.system.gearGrid.slot1='also-gone';
  await clearGear(actor,'slot0');assert.equal(actor.system.gearGrid.slot1,'also-gone');await cleanupDeletedGear(actor,'also-gone');assert.equal(actor.system.gearGrid.slot1,'');
});
test('read-only, invalid slots, inaccessible sources and non-gear produce no writes',async()=>{
  const {actor,source,created}=fixture();actor.isOwner=false;await assert.rejects(receiveItem(actor,source(),'slot0'),/Ownership/);await assert.rejects(clearGear(actor,'slot0'),/Ownership/);
  actor.isOwner=true;await assert.rejects(receiveItem(actor,source('resource'),'slot0'),/Only Gear/);await assert.rejects(receiveItem(actor,source(),'bad'),/Unknown/);
  await assert.rejects(receiveItem(actor,{...source(),testUserPermission:()=>false},'slot0'),/access/);assert.equal(created(),0);
});
test('single drop event runs exactly once and simultaneous drops read the latest grid',async()=>{
  const {actor,source,created}=fixture();const event={};const operation=()=>receiveItem(actor,source(),'slot0');
  const [a,b]=await Promise.all([oncePerDrop(event,operation),oncePerDrop(event,operation)]);assert.equal(a,b);assert.equal(created(),1);
  await Promise.all([receiveItem(actor,source(),'slot1'),receiveItem(actor,source(),'slot2')]);assert.equal(created(),3);assert.equal(new Set(Object.values(actor.system.gearGrid).filter(Boolean)).size,3);
});
test('closest target routing and Specials filtering reuse owned Items',async()=>{
  const target=type=>({dataset:{kdmDrop:type}}),gear={documentName:'Item',type:'gear'};
  const cell=target('gear');assert.equal(dropTarget({closest:selector=>selector==='[data-kdm-drop]'?cell:null}),cell);
  assert.equal(acceptsItem(cell,gear,true),true);assert.equal(acceptsItem(cell,gear,false),false);
  for(const type of ['fightingArt','disorder','ability','proficiency']) {
    assert.equal(acceptsItem(target(type),{documentName:'Item',type},true),true);assert.equal(acceptsItem(target(type),gear,true),false);
  }
  assert.equal(acceptsItem(target('inventory'),{documentName:'Actor',type:'survivor'},true),false);
  const {actor,source,created}=fixture();const art=await receiveItem(actor,source('fightingArt'));await receiveItem(actor,art);assert.equal(created(),1);
});
test('assignment planner preserves displaced items and never duplicates an owned ID',()=>{
  const next=assignGear({...grid(),slot0:'a',slot1:'b'},'slot1','a',[{id:'a',type:'gear'},{id:'b',type:'gear'}]);
  assert.equal(next.slot0,'');assert.equal(next.slot1,'a');assert.equal(Object.values(next).filter(id=>id==='a').length,1);
});
test('drag feedback has no child flicker and clears on leave, cancellation and teardown',async()=>{
  const listeners={doc:{},root:{},window:{}};
  const surface=group=>({addEventListener:(type,fn,options)=>{listeners[group][type]=fn;assert.ok(options.signal);}});
  const doc={...surface('doc'),defaultView:{...surface('window'),AbortController}};
  const classes=new Set(),child={};const target={dataset:{kdmDrop:'gear'},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},contains:node=>node===child};
  const element={...surface('root'),ownerDocument:doc};const sheet={element,isEditable:true};
  globalThis.game={user:{}};globalThis.foundry={applications:{ux:{TextEditor:{getDragEventData:()=>({type:'Item',uuid:'Item.a'})}}},documents:{Item:{implementation:{fromDropData:async()=>({documentName:'Item',type:'gear',testUserPermission:()=>true})}}}};
  installDropFeedback(sheet);
  const start=async()=>{let observer;const event={composedPath:()=>[{addEventListener:(type,fn)=>observer=fn}]};listeners.window.dragstart(event);observer(event);await Promise.resolve();await Promise.resolve();};
  await start();
  const event={target:{closest:()=>target},preventDefault(){},dataTransfer:{}};
  listeners.root.dragover(event);assert.equal(classes.has('kdm-drop-valid'),true);
  listeners.root.dragleave({relatedTarget:child});assert.equal(classes.has('kdm-drop-valid'),true);
  listeners.root.dragleave({relatedTarget:null});assert.equal(classes.size,0);
  listeners.root.dragover(event);listeners.doc.keydown({key:'Escape'});assert.equal(classes.size,0);
  await start();listeners.root.dragover(event);listeners.doc.drop({});assert.equal(classes.size,0);
  sheet.isEditable=false;await start();listeners.root.dragover(event);assert.equal(classes.size,0);assert.equal(event.dataTransfer.dropEffect,'none');
  const previous=sheet._dropFeedback;installDropFeedback(sheet);assert.equal(previous.signal.aborted,true);
});
test('unobserved external dragstart does not veto a drop or claim a valid target',()=>{
  const listeners={};const doc={addEventListener(){},defaultView:{AbortController,addEventListener(){}}};
  const sheet={isEditable:true,element:{ownerDocument:doc,addEventListener:(type,fn)=>listeners[type]=fn}};
  installDropFeedback(sheet);
  let highlighted=false;const target={dataset:{kdmDrop:'gear'},classList:{add:()=>highlighted=true,remove(){}}};
  const event={target:{closest:()=>target},preventDefault(){},dataTransfer:{dropEffect:'none'}};
  listeners.dragover(event);assert.equal(event.dataTransfer.dropEffect,'copy');assert.equal(highlighted,false);
});
