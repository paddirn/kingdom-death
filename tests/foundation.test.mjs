import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Handlebars from "handlebars";
// Structural test double only: not a Foundry implementation or validation test.
class Field { constructor(options = {}) { this.options = options; } }
class ArrayField extends Field { constructor(element, options) { super(options); this.element=element; } }
class Schema extends Field { constructor(fields) { super(); this.fields = fields; } }
class TypeDataModel {
  static migrateData(source) {return source;}
  static _cleanData(data) { return data; }
  static validateJoint() {}
  constructor(data = {}) { Object.assign(this, defaults(this.constructor.defineSchema()), data); }
  validate() {
    // Offline contract check only, not Foundry's validation implementation.
    const visit = (schema, data) => {
      for (const [key,field] of Object.entries(schema)) {
        const value = data[key];
        if (field instanceof Schema) visit(field.fields,value);
        else {
          const o = field.options;
          if (o.choices && value === "" && o.blank !== true) throw new Error(`${key}: blank choice requires explicit blank permission`);
          if (o.choices && !o.choices.includes(value)) throw new Error(`${key}: invalid choice`);
          if (typeof value === "number" && (o.min !== undefined && value < o.min)) throw new Error(`${key}: below minimum`);
        }
      }
    };
    visit(this.constructor.defineSchema(),this); this.constructor.validateJoint(this); return true;
  }
}
class Sheet {
  async _onDropItem(event,item) { this.nativeDrop=item; return item; }
  _processFormData(event, form, formData) { return formData.object; }
  async _prepareContext() { return {}; }
  async _onRender() {}
  async _processSubmitData(event,form,data) { if(this.failSave) throw new Error("save failed"); this.saved=data; return data; }
}
const registered = [], once = new Map(), settings = [];
globalThis.foundry = {
  data: {fields: {ArrayField, NumberField: Field, StringField: Field, BooleanField: Field, SchemaField: Schema}},
  abstract: {TypeDataModel}, documents: {Actor: class Actor {}, Item: class Item {}},
  applications: {api: {HandlebarsApplicationMixin: Base => Base, ApplicationV2: Sheet},
    sheets: {ActorSheetV2: Sheet, ItemSheetV2: Sheet}, apps: {DocumentSheetConfig: {registerSheet: (...args) => registered.push(args)}}}
};
globalThis.Hooks = {once: (key, fn) => once.set(key, fn), on: () => {}};
globalThis.CONFIG = {Actor: {dataModels: {}}, Item: {dataModels: {}}};
globalThis.game = {system: {version: JSON.parse(fs.readFileSync(new URL("../system.json",import.meta.url))).version}, settings: {register: (...args) => settings.push(args), registerMenu: (...args) => settings.push(args)}, actors: {contents: []}};
await import("../scripts/main.mjs");
const { SurvivorData } = await import("../scripts/models/survivor.mjs");
const { MonsterData } = await import("../scripts/models/monster.mjs");
const { SettlementData } = await import("../scripts/models/settlement.mjs");
const { itemModels } = await import("../scripts/models/items.mjs");
const { SurvivorSheet } = await import("../scripts/sheets/survivor.mjs");
const { SettlementSheet } = await import("../scripts/sheets/settlement.mjs");
function defaults(schema) {
  return Object.fromEntries(Object.entries(schema).map(([key,field]) => [key,
    field instanceof Schema ? defaults(field.fields) : field.options.initial]));
}
test("init model and sheet registration matches manifest subtype declarations", () => {
  once.get("init")();
  const manifest = JSON.parse(fs.readFileSync(new URL("../system.json",import.meta.url)));
  assert.deepEqual(Object.keys(CONFIG.Actor.dataModels).sort(), Object.keys(manifest.documentTypes.Actor).sort());
  assert.deepEqual(Object.keys(CONFIG.Item.dataModels).sort(), Object.keys(manifest.documentTypes.Item).sort());
  assert.equal(registered.length,4);
  assert.equal(game.kingdomDeath.version, manifest.version);
  assert.ok(registered.every(r => r[3].makeDefault));
  assert.equal(settings.find(s => s[1] === "activeSettlement")[2].scope,"world");
});
test("survivor defaults distinguish head and brain injury from other locations", () => {
  const data = defaults(SurvivorData.defineSchema());
  assert.equal(data.attributes.movement,5);
  assert.equal(data.locations.head.light,undefined);
  assert.equal(data.locations.head.heavy,false);
  assert.equal(data.locations.body.light,false);
  assert.equal(data.brainInjury,false);
  assert.equal(Object.keys(data.gearGrid).length,9);
});
test("gear and resources have separate storage contracts", () => {
  const gear = defaults(itemModels.gear.defineSchema());
  const resource = itemModels.resource.defineSchema();
  assert.equal(gear.affinities.top,"none");
  assert.equal(gear.quantity,undefined);
  assert.equal(resource.quantity.options.min,0);
  assert.equal(resource.quantity.options.integer,true);
  assert.equal(resource.quantity.options.initial,1);
});
test("survivor submission calls duplicate-grid validation", () => {
  const sheet = new SurvivorSheet();
  sheet.actor = {items: {contents:[{id:"x",type:"gear"}]}};
  assert.throws(() => sheet._processFormData(null,null,{object:{system:{gearGrid:{slot0:"x",slot1:"x"}}}}), /two slots/);
});
test("settlement submission calls party validation", () => {
  game.actors.contents = [{id:"s",type:"survivor"}];
  const sheet = new SettlementSheet();
  assert.throws(() => sheet._processFormData(null,null,{object:{system:{campaign:{phase:"hunt",party:{slot0:"s",slot1:"s"}}}}}), /only once/);
});
Handlebars.registerHelper("checked", value => value ? "checked" : "");
Handlebars.registerHelper("eq", (a,b) => a === b);
function render(file, context) { return Handlebars.compile(fs.readFileSync(new URL(`../templates/${file}.hbs`,import.meta.url),"utf8"))(context); }
test("all templates render representative records and escape private text", () => {
  const name = '<img src=x onerror="bad()">';
  const common = {actor:{name}, item:{name}, editable:true, inventory:[]};
  const fixtures = {
    survivor:{...common,system:defaults(SurvivorData.defineSchema()),cells:Array.from({length:9},(_,index)=>({key:`slot${index}`,index,row:Math.floor(index/3),column:index%3,choices:[]}))},
    monster:{...common,system:defaults(MonsterData.defineSchema())},
    settlement:{...common,system:defaults(SettlementData.defineSchema())},
    item:{...common,system:defaults(itemModels.gear.defineSchema()),isGear:true},
    'campaign-picker':{isGM:true,settlements:[{id:"s",name}]}
  };
  for (const [file, context] of Object.entries(fixtures)) {
    const html = render(file,context);
    assert.ok(html.includes("&lt;img"),file);
    assert.ok(!html.includes('<img src=x'),file);
    assert.match(html,/type="submit"/);
  }
  const html = render("survivor",fixtures.survivor);
  assert.equal((html.match(/class="kdm-gear-cell"/g) ?? []).length,9);
});
test("read-only sheet disables fieldset and omits Save", () => {
  const html = render("monster",{actor:{name:"Read only"},system:defaults(MonsterData.defineSchema()),editable:false});
  assert.match(html,/<fieldset disabled>/);
  assert.ok(!html.includes('type="submit"'));
});
test("resource quantity renders zero rather than disappearing", () => {
  const html = render("item",{item:{name:"Test"},isResource:true,system:{...defaults(itemModels.resource.defineSchema()),quantity:0},editable:true});
  assert.match(html,/name="system.quantity" value="0"/);
});
test("new survivor fields default safely while old data paths remain", () => {
  const schema = SurvivorData.defineSchema(), data = defaults(schema);
  for (const key of ["cannotSpendSurvival","cannotUseFightingArts","skipNextHunt","rerollUsed"]) assert.equal(data[key],false);
  for (const key of ["sex","impairments","oncePerLifetime"]) assert.equal(data[key],"");
  assert.deepEqual(data.weaponProficiency,{type:"",value:0,specialist:false,master:false});
  const legacy = {huntXP:6,courage:3,notes:"Old notes",gearGrid:{slot0:"owned"}};
  const augmented = {...data,...legacy};
  assert.equal(augmented.huntXP,6); assert.equal(augmented.gearGrid.slot0,"owned");
  assert.equal(augmented.cannotUseFightingArts,false);
  assert.equal(schema.huntXP.options.initial,0);
});
test("survivor context filters special Items and preserves active tab", async () => {
  game.i18n = {localize:key=>key};
  const items = [{id:"a",name:"Art",type:"fightingArt",sort:0},{id:"d",name:"Disorder",type:"disorder",sort:1},{id:"b",name:"Ability",type:"ability",sort:2},{id:"g",name:"Gear",type:"gear",sort:3}];
  const sheet = new SurvivorSheet();sheet.actor={system:defaults(SurvivorData.defineSchema()),items:{contents:items,filter:fn=>items.filter(fn)}};
  sheet.tabGroups.primary="specials";
  const context=await sheet._prepareContext({});
  assert.deepEqual(context.arts.map(i=>i.id),["a"]);assert.deepEqual(context.disorders.map(i=>i.id),["d"]);assert.deepEqual(context.abilities.map(i=>i.id),["b"]);
  assert.equal(context.active.specials,true);assert.equal(context.cells.length,9);
  const html=render("survivor",context);
  assert.match(html,/class="tab active" data-group="primary" data-tab="specials"/);
  assert.ok(html.indexOf('<h2>Fighting Arts')<html.indexOf('<h2>Disorders'));
  for (const key of ["cannotUseFightingArts","impairments","skipNextHunt","oncePerLifetime","rerollUsed"]) assert.ok(html.includes(`name="system.${key}"`));
});
test("rerenders restore only draft fields and retain checkbox false", async () => {
  const sheet=new SurvivorSheet(); sheet.isEditable=true; sheet.actor={system:{}};
  const inputs=[{name:"name",value:"Remote"},{name:"system.rerollUsed",type:"checkbox",checked:true},{name:"system.notes",value:"Remote notes"}];
  const handlers={};sheet.element={querySelector:()=>null, querySelectorAll:selector=>selector==="[name]"?inputs:[],addEventListener:(type,fn)=>handlers[type]=fn};
  sheet._draft.set("name","Unsaved name");sheet._draft.set("system.rerollUsed",false);
  sheet.tabGroups.primary="gear";
  await sheet._onRender({},{});
  assert.equal(inputs[0].value,"Unsaved name");assert.equal(inputs[1].checked,false);assert.equal(inputs[2].value,"Remote notes");
  handlers.input({target:{name:"system.impairments",value:"Draft impairment"}});
  assert.equal(sheet._draft.get("system.impairments"),"Draft impairment");assert.equal(sheet.tabGroups.primary,"gear");
});
test("successful Save clears draft; failure retains it for correction", async () => {
  const sheet=new SurvivorSheet();sheet._draft.set("system.notes","draft");sheet.failSave=true;
  await assert.rejects(sheet._processSubmitData(null,null,{}),/save failed/);
  assert.equal(sheet._draft.get("system.notes"),"draft");sheet.failSave=false;
  const data={system:{notes:"draft",cannotUseFightingArts:true,impairments:"injury",rerollUsed:false}};
  await sheet._processSubmitData(null,null,data);
  assert.deepEqual(sheet.saved,data);assert.equal(sheet._draft.size,0);
});

test("new Survivor constructs with default values and passes offline validation contract", () => {
  const survivor = new SurvivorData();
  assert.equal(survivor.sex, "");
  assert.equal(survivor.validate(), true);
  const schema = SurvivorData.defineSchema();
  assert.deepEqual(schema.sex.options.choices, ["", "M", "F"]);
  for (const value of ["", "M", "F"]) assert.equal(new SurvivorData({sex:value}).validate(),true);
  assert.throws(() => new SurvivorData({sex:"invalid"}).validate(), /invalid choice/);
  for (const field of [schema.sex,schema.impairments,schema.oncePerLifetime,schema.weaponProficiency.fields.type]) {
    assert.equal(field.options.initial, ""); assert.equal(field.options.blank,true);
  }
});
test("refinement defaults validate and preserve old milestone fields", () => {
  const model=new SurvivorData();assert.equal(model.validate(),true);
  assert.deepEqual(model.survivalActions,{dodge:false,encourage:false,surge:false,dash:false,endure:false});
  assert.equal(model.courageChoice,'');assert.equal(model.understandingChoice,'');
  for (const [key,value] of [['courageChoice','prepared'],['understandingChoice','analyze']]) {
    assert.equal(new SurvivorData({[key]:value}).validate(),true);
    assert.throws(()=>new SurvivorData({[key]:'wrong'}).validate(),/invalid choice/);
  }
  assert.deepEqual(Object.keys(model.ageMilestones),['age1','age2','age3','age4']);
});
test("refined layout places Hunt XP on right and retains Gear panel markup", async () => {
  game.i18n={localize:key=>key};const sheet=new SurvivorSheet();
  sheet.actor={system:defaults(SurvivorData.defineSchema()),items:{contents:[],filter:()=>[]}};
  const html=render('survivor',await sheet._prepareContext({}));
  assert.ok(html.indexOf('<h2>Survival')<html.indexOf('<h2>Hunt XP'));
  assert.ok(html.indexOf('<h2>Hunt XP')<html.indexOf('<h2>Weapon Proficiency'));
  assert.equal((html.match(/name="system.sex"/g)||[]).length,1);
  for(const key of ['dodge','encourage','surge','dash','endure']) assert.ok(html.includes(`name="system.survivalActions.${key}"`));
  for(const key of ['courageChoice','understandingChoice']) assert.equal((html.match(new RegExp(`name="system.${key}"`,'g'))||[]).length,4);
  for(const text of ['Milestones: 2 / 6 / 10 / 15','Heavy Injury: Knocked Down (all locations)']) assert.ok(html.includes(text));
  assert.equal((html.match(/data-kdm-drop="gear"/g)||[]).length,9);
});
test("radio draft restores exactly one selection independently per group", async () => {
  const sheet=new SurvivorSheet();sheet.actor={system:{}};sheet.isEditable=true;
  const inputs=[{name:'system.courageChoice',type:'radio',value:'stalwart'}, {name:'system.courageChoice',type:'radio',value:'prepared'}, {name:'system.understandingChoice',type:'radio',value:''}];
  const handlers={};sheet.element={querySelector:()=>null, querySelectorAll:s=>s==='[name]'?inputs:[],addEventListener:(t,fn)=>handlers[t]=fn};
  sheet._draft.set('system.courageChoice','prepared');sheet._draft.set('system.understandingChoice','');
  await sheet._onRender({},{});
  assert.equal(inputs[0].checked,false);assert.equal(inputs[1].checked,true);assert.equal(inputs[2].checked,true);
  handlers.change({target:{name:'system.courageChoice',type:'radio',value:'',checked:true}});
  assert.equal(sheet._draft.get('system.courageChoice'),'');
});

test('additive Survivor and Proficiency defaults validate and survive serialization',()=>{
  const survivor=new SurvivorData(), proficiency=new itemModels.proficiency();
  assert.equal(survivor.validate(),true);assert.equal(proficiency.validate(),true);
  assert.equal(survivor.proficiencyUuid,'');assert.deepEqual(survivor.family,{parents:{parent1:'',parent2:''},children:[]});
  assert.equal(Object.keys(survivor.customTokens).length,5);assert.deepEqual(survivor.customTokens.token1,{label:'_ tokens',value:0});
  assert.equal(proficiency.type,'');assert.equal(proficiency.rank,'specialist');assert.deepEqual(proficiency.keywords,[]);assert.equal(proficiency.description,'');
  const saved=JSON.parse(JSON.stringify({...survivor,proficiencyUuid:'Item.x',family:{parents:{parent1:'a',parent2:''},children:['b']},customTokens:{...survivor.customTokens,token1:{label:'Pain',value:2}}}));
  assert.equal(new SurvivorData(saved).validate(),true);assert.equal(saved.customTokens.token1.value,2);
  assert.equal(new itemModels.proficiency({keywords:['Sharp'],description:'first\nsecond'}).validate(),true);
});
test('all five tabs, read-only progress totals and full-width counters render',async()=>{
  game.i18n={localize:key=>key};const sheet=new SurvivorSheet();sheet.actor={id:'self',system:defaults(SurvivorData.defineSchema()),items:{contents:[],filter:()=>[]}};
  const context=await sheet._prepareContext({}),html=render('survivor',context);
  assert.deepEqual(SurvivorSheet.TABS.primary.tabs.map(t=>t.id),['attributes','gear','specials','family','image']);
  for(const path of ['huntXP','weaponProficiency.value','courage','understanding']) assert.ok(html.includes(`readonly min="0" step="1" name="system.${path}"`));
  for(let i=1;i<=5;i++) assert.ok(html.includes(`name="system.customTokens.token${i}.value"`));
  assert.ok(html.includes('>Male</option>'));assert.ok(html.includes('>Female</option>'));assert.ok(html.includes('value="" selected>Unspecified'));
  assert.match(html, /<\/div><\/div>\s*<section class="kdm-conditions">/);
  assert.ok(html.includes('data-image-path="img"'));assert.ok(html.includes('data-image-path="prototypeToken.texture.src"'));
});
test('progress actions immediately synchronize one authoritative total and track',()=>{
  const sheet=new SurvivorSheet();sheet.isEditable=true;const input={value:'0',dispatchEvent:event=>assert.equal(event.type,'input')};
  const boxes=[1,2,3,4].map(value=>({dataset:{value:String(value)}}));sheet.element={querySelector:()=>input, querySelectorAll:()=>boxes};
  SurvivorSheet.progress.call(sheet,null,{dataset:{path:'system.huntXP',value:'3'}});assert.equal(Number(input.value),3);assert.deepEqual(boxes.map(b=>b.checked),[true,true,true,false]);
  SurvivorSheet.progress.call(sheet,null,{dataset:{path:'system.huntXP',value:'3'}});assert.equal(Number(input.value),2);
  sheet.isEditable=false;SurvivorSheet.progress.call(sheet,null,{dataset:{value:'4'}});assert.equal(Number(input.value),2);
});
test('new family and image tabs preserve dirty fields and selection during rerender',async()=>{
  const sheet=new SurvivorSheet();sheet.isEditable=true;sheet.actor={system:{}};sheet.tabGroups.primary='family';
  const inputs=[{name:'system.notes',value:'server'},{name:'system.proficiencyUuid',value:''}];sheet._draft.set('system.notes','unsaved');sheet._draft.set('system.proficiencyUuid','Item.x');
  sheet.element={querySelector:()=>null, querySelectorAll:s=>s==='[name]'?inputs:[],addEventListener:()=>{}};
  await sheet._onRender({},{});assert.equal(inputs[0].value,'unsaved');assert.equal(inputs[1].value,'Item.x');assert.equal(sheet.tabGroups.primary,'family');
});
test('Item proficiency form submits structured tags and derived name',async()=>{
  const {KDMItemSheet}=await import('../scripts/sheets/item.mjs');const sheet=new KDMItemSheet();sheet.item={type:'proficiency',system:{keywords:['old']}};sheet._tags=[' New ','new','Second'];
  const data=sheet._processFormData(null,null,{object:{name:'wrong',system:{type:'Sword',rank:'mastery',description:'a\nb'}}});
  assert.deepEqual(data.system.keywords,['New','Second']);assert.equal(data.name,'Sword (master)');assert.equal(data.system.description,'a\nb');
});
test('family dead overlay and Item preview are rendered independently of edit controls',()=>{
  const html=render('survivor',{actor:{},system:{},editable:false,family:{current:{available:true,id:'x',img:'x.png',name:'Dead',dead:true}}});
  assert.match(html,/class="kdm-dead" aria-label="Dead"/);
  const item=render('item',{item:{name:'Card',img:'card.png'},system:{},editable:false});
  assert.ok(item.indexOf('data-action="previewImage"')<item.indexOf('<fieldset disabled>'));
  assert.match(item,/aria-label="Choose Item image" disabled/);
});
test('square controls use below-field layout while progression remains read-only',()=>{
  const css=fs.readFileSync(new URL('../styles/kingdom-death.css',import.meta.url),'utf8');
  assert.match(css,/kdm-square-numbers \.kdm-stepper input \{ grid-row:1; grid-column:1 \/ 3/);
  assert.match(css,/kdm-square-numbers \.kdm-stepper button \{ grid-row:2/);
  assert.match(css,/kdm-radio-option input\[type=radio\]::after \{ content:none/);
});

test('Hunt XP and compact Proficiency omit redundant controls while legacy schema remains',async()=>{
  game.i18n={localize:key=>key};const sheet=new SurvivorSheet();sheet.actor={system:defaults(SurvivorData.defineSchema()),items:{contents:[],filter:()=>[]}};
  const html=render('survivor',await sheet._prepareContext({}));
  assert.equal((html.match(/<h2>Hunt XP<\/h2>/g)||[]).length,1);assert.ok(!html.includes('<h3>Hunt XP'));
  for(const removed of ['name="system.ageMilestones.','name="system.weaponProficiency.type"','name="system.proficiencyUuid"','data-proficiency-select','Resolve milestones manually.','kdm-sex-bar','>Armor<input']) assert.ok(!html.includes(removed),removed);
  const condition=html.slice(html.indexOf('class="kdm-conditions"'),html.indexOf('data-tab="gear"><'));
  assert.ok(condition.indexOf('name="system.knockedDown"')<condition.indexOf('name="system.retired"'));
  assert.ok(condition.indexOf('name="system.retired"')<condition.indexOf('name="system.dead"'));
  assert.ok(html.includes('aria-label="Head armor"'));assert.ok(html.includes('<span>Survival Limit</span>'));
  assert.equal(Object.keys(SurvivorData.defineSchema().ageMilestones.fields).length,4);
});
test('Proficiency renders a name-only native UUID link, placeholder or missing state',()=>{
  const base={actor:{},system:{}};
  const linked=render('survivor',{...base,proficiencyUuid:'Item.proficiency',proficiencyName:'Sword (specialist)',proficiencyAvailable:true});
  assert.match(linked,/class="content-link"[^>]+data-uuid="Item.proficiency"[^>]*>Sword \(specialist\)<\/a>/);
  assert.ok(!linked.includes('>Item.proficiency<'));
  assert.ok(render('survivor',base).includes('Drop Proficiency Item here'));
  assert.ok(render('survivor',{...base,proficiencyUuid:'Item.deleted'}).includes('Missing or unavailable Proficiency'));
});
test('Save omits immediate grid state and hidden legacy fields but persists draft UUID and Retired',()=>{
  const sheet=new SurvivorSheet();sheet.actor={system:{gearGrid:{slot0:'live'}},items:{contents:[{id:'live',type:'gear'}]}};
  sheet._draft.set('system.proficiencyUuid','Item.next');
  const data=sheet._processFormData(null,null,{object:{system:{retired:true,notes:'draft'}}});
  assert.equal(data.system.gearGrid,undefined);assert.equal(data.system.ageMilestones,undefined);assert.equal(data.system.weaponProficiency,undefined);
  assert.equal(data.system.proficiencyUuid,'Item.next');assert.equal(data.system.retired,true);assert.equal(data.system.notes,'draft');
});
test('sex color updates only the existing header line and responsive layout has paired rows',()=>{
  const sheet=new SurvivorSheet(),colors=[];sheet.element={querySelector:selector=>{assert.equal(selector,'.kdm-survivor-header');return {style:{setProperty:(key,value)=>colors.push([key,value])}};}};
  for(const sex of ['M','F','']) sheet.updateSexBar(sex);
  assert.deepEqual(colors.map(c=>c[1]),['#a8d8f0','#efacc4','#888']);
  const css=fs.readFileSync(new URL('../styles/kingdom-death.css',import.meta.url),'utf8');
  assert.match(css,/grid-template-rows:subgrid/);assert.match(css,/kdm-inventory-cards \{ display:grid; grid-template-columns:repeat\(3/);
  assert.match(css,/tab\[data-tab=specials\]\.active \{ display:grid; grid-template-columns:repeat\(2/);
});
test('sheet drop routing rejects invalid and read-only targets without invoking inventory',async()=>{
  const sheet=new SurvivorSheet();sheet.isEditable=true;let links=0,renders=0;
  sheet.linkProficiency=async uuid=>{links++;assert.equal(uuid,'Item.p');};sheet.render=()=>renders++;
  const warnings=[];globalThis.ui={notifications:{warn:message=>warnings.push(message)}};
  const target={dataset:{kdmDrop:'proficiency'}},event={target:{closest:()=>target}};
  const item={documentName:'Item',type:'proficiency',uuid:'Item.p'};
  await Promise.all([sheet._onDropItem(event,item),sheet._onDropItem(event,item)]);assert.equal(links,1);
  await sheet._onDropItem({target:event.target},{...item,type:'gear'});assert.equal(links,1);assert.equal(warnings.length,1);
  sheet.isEditable=false;await sheet._onDropItem({target:event.target},item);assert.equal(links,1);assert.equal(renders,0);
});

test('untargeted Item drops retain the inherited native handler',async()=>{
  const sheet=new SurvivorSheet(),item={documentName:'Item',type:'resource'};
  assert.equal(await sheet._onDropItem({target:{closest:()=>null}},item),item);
  assert.equal(sheet.nativeDrop,item);
});
test('Survivor uses one cached native V14 DragDrop controller with root target and native callbacks',async()=>{
  let count=0;foundry.applications.ux={DragDrop:class{constructor(config){this.config=config;count++;}},TextEditor:{getDragEventData:event=>event.data}};
  const sheet=new SurvivorSheet();sheet.actor={isOwner:true};sheet.isEditable=true;
  sheet._onDragStart=()=>{};sheet._onDragOver=()=>{};
  const controller=sheet._dragDrop;assert.equal(sheet._dragDrop,controller);assert.equal(count,1);
  assert.equal(controller.config.dropSelector,null);assert.equal(controller.config.dragSelector,'.draggable[data-item-id]');assert.equal(controller.config.permissions.drop(),true);
  let calls=0;Sheet.prototype._onDrop=async()=>{calls++;};
  const event={data:{type:'Item'},target:{closest:()=>null}};
  await Promise.all([controller.config.callbacks.drop(event),controller.config.callbacks.drop(event)]);assert.equal(calls,1);
  sheet.isEditable=false;assert.equal(controller.config.permissions.drop(),false);
});
test('bare UUID drops resolve once, route to Item handler and warn on unavailable references',async()=>{
  const sheet=new SurvivorSheet();sheet.actor={isOwner:true};sheet.isEditable=true;
  foundry.applications.ux={TextEditor:{getDragEventData:()=>({})}};
  const item={documentName:'Item',type:'proficiency'};globalThis.fromUuid=async uuid=>uuid==='Item.valid'?item:null;
  let handled=0;sheet._onDropItem=async(event,doc)=>{assert.equal(doc,item);handled++;};
  const event={dataTransfer:{getData:()=> 'Item.valid'},target:{closest:()=>null}};
  await Promise.all([sheet._onDrop(event),sheet._onDrop(event)]);assert.equal(handled,1);
  const warnings=[];globalThis.ui={notifications:{warn:m=>warnings.push(m)}};
  await sheet._onDrop({dataTransfer:{getData:()=> 'Item.gone'},target:event.target});assert.match(warnings[0],/accessible/);
});
test('Survivor has exactly one header Save, ten-column Hunt XP and enlarged read-only totals',()=>{
  const html=render('survivor',{actor:{},system:{},editable:true});
  assert.equal((html.match(/type="submit"/g)||[]).length,1);
  assert.ok(html.indexOf('class="kdm-header-save"')<html.indexOf('</header>'));
  assert.ok(html.indexOf('name="system.sex"')<html.indexOf('class="kdm-header-save"'));
  assert.ok(!render('survivor',{actor:{},system:{},editable:false}).includes('type="submit"'));
  const css=fs.readFileSync(new URL('../styles/kingdom-death.css',import.meta.url),'utf8');
  assert.match(css,/kdm-hunt-xp \.kdm-track-boxes \{ display:grid; grid-template-columns:repeat\(10,18px\)/);
  assert.match(css,/input.kdm-number-display \{ width:56px/);
});

test('Survival model cleans complete pairs, leaves partial updates intact and validates the invariant',()=>{
  const original={survival:{value:5,limit:3},notes:'keep'};
  SurvivorData._cleanData(original,{},{});assert.deepEqual(original,{survival:{value:3,limit:3},notes:'keep'});
  const partial={survival:{limit:2}};SurvivorData._cleanData(partial,{},{});assert.deepEqual(partial,{survival:{limit:2}});
  assert.throws(()=>SurvivorData.validateJoint({survival:{value:6,limit:5}}),/Survival/);
  assert.throws(()=>SurvivorData.validateJoint({survival:{value:-1,limit:5}}),/Survival/);
  assert.equal(new SurvivorData().validate(),true);
});
test('Survival submission clamps simultaneous edits and preserves unrelated draft data',()=>{
  const sheet=new SurvivorSheet();sheet.actor={system:{gearGrid:{},survival:{value:5,limit:5}},items:{contents:[]}};
  globalThis.ui={notifications:{info:()=>{}}};
  const data=sheet._processFormData(null,null,{object:{system:{survival:{value:9,limit:3},notes:'keep'}}});
  assert.deepEqual(data.system.survival,{value:3,limit:3});assert.equal(data.system.notes,'keep');
});
test('Living Glossary settings menu is GM restricted and template disables unavailable sync',()=>{
  assert.equal(settings.find(s=>s[1]==='glossary')[2].restricted,true);
  const html=render('living-glossary',{canSync:false,permissionError:'Only a GM can sync.'});
  assert.match(html,/type="submit" disabled/);assert.match(html,/Only a GM/);
  assert.match(render('living-glossary',{canSync:true}),/type="submit" >Sync Now/);
});

test('all Item models migrate legacy keywords without splitting punctuation and preserve other data',()=>{
  for(const Model of Object.values(itemModels)) {
    for(const [old,expected] of [['',[]],[' Sharp, heavy; edge ',['Sharp, heavy; edge']],[[' A ','a','B'],['A','B']]]) {
      const source={keywords:old,source:'book',notes:'keep'};
      const migrated=Model.migrateData(source);
      assert.deepEqual(migrated.keywords,expected);assert.equal(migrated.source,'book');assert.equal(migrated.notes,'keep');
      assert.equal(new Model(migrated).validate(),true);
    }
    assert.deepEqual(Model.migrateData({notes:'keep'}),{notes:'keep'});
    assert.deepEqual(defaults(Model.defineSchema()).keywords,[]);
  }
  for(const [old,next] of [['specialization','specialist'],['mastery','master'],['none','none']]) assert.equal(itemModels.proficiency.migrateData({rank:old}).rank,next);
});
test('additional proficiency references deduplicate, unlink and submit independently of primary',async()=>{
  const sheet=new SurvivorSheet();sheet.isEditable=true;sheet.render=()=>{};
  sheet.actor={system:{proficiencyUuid:'Item.primary',additionalProficiencies:['Item.extra'],gearGrid:{}},items:{contents:[]}};
  globalThis.fromUuid=async()=>({documentName:'Item',type:'proficiency',testUserPermission:()=>true});
  const event=()=>({target:{closest:()=>({dataset:{kdmDrop:'additionalProficiency'}})}});
  await sheet._onDropItem(event(),{documentName:'Item',type:'proficiency',uuid:'Item.extra'});
  await sheet._onDropItem(event(),{documentName:'Item',type:'proficiency',uuid:'Item.next'});
  assert.deepEqual(sheet._draft.get('system.additionalProficiencies'),['Item.extra','Item.next']);
  SurvivorSheet.unlinkProficiency.call(sheet,null,{dataset:{uuid:'Item.extra'}});
  const data=sheet._processFormData(null,null,{object:{system:{impairments:'kept',skipNextHunt:true}}});
  assert.deepEqual(data.system.additionalProficiencies,['Item.next']);assert.equal(data.system.proficiencyUuid,undefined);assert.equal(data.system.impairments,'kept');assert.equal(data.system.skipNextHunt,true);
});
test('shared Item tags have no Add button and Source follows all specific fields',()=>{
  for(const type of Object.keys(itemModels)) {
    const html=render('item',{item:{},system:{},editable:true,isProficiency:type==='proficiency',isGear:type==='gear',isResource:type==='resource'});
    assert.match(html,/data-keyword-entry/);assert.ok(!html.includes('data-action="addKeyword"'));
    assert.equal((html.match(/name="system.source"/g)||[]).length,1);
    assert.ok(html.indexOf('name="system.source"')>html.indexOf('name="system.notes"'));
  }
});
test('keyword Enter prevents form submission, tags survive rerender and readonly refuses edits',async()=>{
  const {KDMItemSheet}=await import('../scripts/sheets/item.mjs');const sheet=new KDMItemSheet();
  const handlers={},input={value:'',matches:s=>s==='[data-keyword-entry]'};
  sheet.item={type:'gear',system:{keywords:['Old']}};sheet.isEditable=true;sheet.render=()=>{};
  sheet.element={ownerDocument:{defaultView:{AbortController}},querySelector:()=>input,querySelectorAll:()=>[],addEventListener:(t,f)=>handlers[t]=f};
  await sheet._onRender({},{});input.value=' New ';let prevented=0,stopped=0;
  handlers.keydown({key:'Enter',target:input,preventDefault:()=>prevented++,stopPropagation:()=>stopped++});
  assert.equal(prevented,1);assert.equal(stopped,1);assert.deepEqual(sheet._tags,['Old','New']);
  await sheet._onRender({},{});assert.deepEqual(sheet._tags,['Old','New']);assert.equal(input.value,'');
  KDMItemSheet.removeKeyword.call(sheet,null,{dataset:{index:'0'}});assert.deepEqual(sheet._tags,['New']);
  sheet.isEditable=false;input.value='blocked';KDMItemSheet.addKeyword.call(sheet);assert.deepEqual(sheet._tags,['New']);
});
test('combined Specials retain independent types and fields while primary legacy rank controls are hidden',async()=>{
  const sheet=new SurvivorSheet();sheet.actor={system:defaults(SurvivorData.defineSchema()),items:{contents:[{id:'f',name:'Art',type:'fightingArt',sort:0},{id:'a',name:'Ability',type:'ability',sort:1}],filter:()=>[]}};
  const context=await sheet._prepareContext({});assert.deepEqual(context.specials.map(i=>i.label),['fighting art','ability']);
  const html=render('survivor',{actor:{},system:sheet.actor.system,editable:true,...context});
  assert.match(html,/Fighting Arts &amp; Abilities/);assert.match(html,/Disorders &amp; Impairments/);
  assert.ok(!html.includes('name="system.weaponProficiency.specialist"'));assert.ok(!html.includes('data-kdm-drop="ability"'));
  assert.match(html,/name="system.impairments"/);assert.match(html,/name="system.skipNextHunt"/);
});
