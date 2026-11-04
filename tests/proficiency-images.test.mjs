import test from 'node:test';
import assert from 'node:assert/strict';
import {proficiencyName,keywords,resolveProficiency} from '../scripts/rules/proficiency.mjs';
import {saveImage,pickImage,previewImage} from '../scripts/ui/images.mjs';
test('proficiency names are valid with blank Type and correctly follow Rank',()=>{
  assert.equal(proficiencyName(' Sword ','specialization'),'Sword (specialist)');
  assert.equal(proficiencyName('Sword','mastery'),'Sword (master)');assert.equal(proficiencyName(''),'Proficiency (specialist)');
});
test('keywords trim, deduplicate without losing first capitalization, remove and round-trip',()=>{
  const tags=keywords([' Sharp ','sharp','', 'Blade','Blade']);assert.deepEqual(tags,['Sharp','Blade']);
  const removed=tags.filter((_,i)=>i!==0);assert.deepEqual(keywords(JSON.parse(JSON.stringify(removed))),['Blade']);
});
test('UUID resolver permits accessible proficiency only and handles missing/deleted/invalid refs',async()=>{
  globalThis.game={user:{}};const item={documentName:'Item',type:'proficiency',testUserPermission:()=>true};
  for(const uuid of ['Item.abc','Compendium.pack.items.Item.abc','Actor.a.Item.b']) assert.equal(await resolveProficiency(uuid,async()=>item),item);
  for(const value of [null,{...item,type:'gear'},{...item,documentName:'Actor'},{...item,testUserPermission:()=>false}]) await assert.rejects(resolveProficiency('uuid',async()=>value),/accessible Proficiency/);
  await assert.rejects(resolveProficiency('bad',async()=>{throw Error();}),/accessible/);assert.equal(await resolveProficiency('',async()=>null),null);
});
test('images use separate native paths, ownership and preview permissions',async()=>{
  const updates=[];const actor={documentName:'Actor',isOwner:true,img:'avatar',prototypeToken:{texture:{src:'token'}},update:async data=>updates.push(data),testUserPermission:()=>true};
  await saveImage(actor,'img','new-avatar');await saveImage(actor,'prototypeToken.texture.src','new-token');
  assert.deepEqual(updates,[{img:'new-avatar'},{'prototypeToken.texture.src':'new-token'}]);
  await assert.rejects(saveImage({...actor,isOwner:false},'img','x'),/Ownership/);
  await assert.rejects(saveImage(actor,'system.image','x'),/Ownership/);
  let picker,preview;globalThis.game={user:{}};globalThis.foundry={applications:{apps:{FilePicker:class{constructor(options){picker=options;}render(){}},ImagePopout:class{constructor(options){preview=options;}render(){}}}}};
  pickImage({...actor,isOwner:false});assert.equal(picker,undefined);
  pickImage(actor,'prototypeToken.texture.src');assert.equal(picker.current,'token');await picker.callback('selected');assert.deepEqual(updates.at(-1),{'prototypeToken.texture.src':'selected'});
  previewImage({...actor,isOwner:false});assert.equal(preview.src,'avatar');preview=null;
  previewImage({...actor,testUserPermission:()=>false});assert.equal(preview,null);
});
test('document lifecycle derives names without a second update and preserves identity',async()=>{
  class BaseItem { async _preCreate(){} async _preUpdate(){} updateSource(data){this.source=data;} }
  const expandObject=data=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v]));
  globalThis.foundry={documents:{Item:BaseItem},utils:{expandObject}};
  const {KDMItem}=await import('../scripts/documents/item.mjs');const item=new KDMItem();item.id='stable';item.uuid='Item.stable';item.type='proficiency';item.system={type:'Sword',rank:'specialization',keywords:['sharp',' sharp ']};
  await item._preCreate({}, {}, {});assert.equal(item.source.name,'Sword (specialist)');assert.deepEqual(item.source['system.keywords'],['sharp']);
  const changes={system:{type:'Axe',rank:'mastery',keywords:[' Edge ','edge']}};await item._preUpdate(changes,{},{});
  assert.equal(changes.name,'Axe (master)');assert.deepEqual(changes.system.keywords,['Edge']);assert.equal(item.uuid,'Item.stable');
  item.type='gear';const original={name:'Original'};await item._preUpdate(original,{},{});assert.deepEqual(original,{name:'Original'});
});

test('None, Specialist and Master names and blank-safe defaults',()=>{
  assert.equal(proficiencyName('Sword','none'),'Sword');assert.equal(proficiencyName('Sword','specialist'),'Sword (specialist)');assert.equal(proficiencyName('Sword','master'),'Sword (master)');assert.equal(proficiencyName('','none'),'Proficiency');
});
test('additional proficiency and combined Specials filters accept only matching types',async()=>{
  const {acceptsItem}=await import('../scripts/ui/item-drops.mjs');
  for(const type of ['gear','proficiency','ability','fightingArt','disorder']) {
    const item={documentName:'Item',type};
    assert.equal(acceptsItem({dataset:{kdmDrop:'additionalProficiency'}},item,true),type==='proficiency');
    assert.equal(acceptsItem({dataset:{kdmDrop:'specials'}},item,true),['ability','fightingArt'].includes(type));
    assert.equal(acceptsItem({dataset:{kdmDrop:'specials'}},item,false),false);
  }
});
