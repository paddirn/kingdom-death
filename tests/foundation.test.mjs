import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Handlebars from "handlebars";
// Structural test double only: not a Foundry implementation or validation test.
class Field { constructor(options = {}) { this.options = options; } }
class ArrayField extends Field { constructor(element, options) { super(options); this.element=element; } }
class Schema extends Field { constructor(fields) { super(); this.fields = fields; } }
class TypeDataModel {
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
    visit(this.constructor.defineSchema(),this); return true;
  }
}
class Sheet {
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
  const handlers={};sheet.element={querySelectorAll:selector=>selector==="[name]"?inputs:[],addEventListener:(type,fn)=>handlers[type]=fn};
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
test("refined layout places Survivor on right and retains Gear panel markup", async () => {
  game.i18n={localize:key=>key};const sheet=new SurvivorSheet();
  sheet.actor={system:defaults(SurvivorData.defineSchema()),items:{contents:[],filter:()=>[]}};
  const html=render('survivor',await sheet._prepareContext({}));
  assert.ok(html.indexOf('<h2>Survival')<html.indexOf('<h2>Survivor'));
  assert.ok(html.indexOf('<h2>Survivor')<html.indexOf('<h2>Weapon Proficiency'));
  assert.equal((html.match(/name="system.sex"/g)||[]).length,1);
  for(const key of ['dodge','encourage','surge','dash','endure']) assert.ok(html.includes(`name="system.survivalActions.${key}"`));
  for(const key of ['courageChoice','understandingChoice']) assert.equal((html.match(new RegExp(`name="system.${key}"`,'g'))||[]).length,4);
  for(const text of ['XP 2','XP 6','XP 10','XP 15','Heavy Injury: Knocked Down (all locations)','Select Before Hunt']) assert.ok(html.includes(text));
  assert.ok(html.includes('name="system.gearGrid.'));
});
test("radio draft restores exactly one selection independently per group", async () => {
  const sheet=new SurvivorSheet();sheet.actor={system:{}};sheet.isEditable=true;
  const inputs=[{name:'system.courageChoice',type:'radio',value:'stalwart'}, {name:'system.courageChoice',type:'radio',value:'prepared'}, {name:'system.understandingChoice',type:'radio',value:''}];
  const handlers={};sheet.element={querySelectorAll:s=>s==='[name]'?inputs:[],addEventListener:(t,fn)=>handlers[t]=fn};
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
  assert.equal(proficiency.type,'');assert.equal(proficiency.rank,'specialization');assert.deepEqual(proficiency.keywords,[]);assert.equal(proficiency.description,'');
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
  const boxes=[1,2,3,4].map(value=>({dataset:{value:String(value)}}));sheet.element={querySelector:()=>input,querySelectorAll:()=>boxes};
  SurvivorSheet.progress.call(sheet,null,{dataset:{path:'system.huntXP',value:'3'}});assert.equal(Number(input.value),3);assert.deepEqual(boxes.map(b=>b.checked),[true,true,true,false]);
  SurvivorSheet.progress.call(sheet,null,{dataset:{path:'system.huntXP',value:'3'}});assert.equal(Number(input.value),2);
  sheet.isEditable=false;SurvivorSheet.progress.call(sheet,null,{dataset:{value:'4'}});assert.equal(Number(input.value),2);
});
test('new family and image tabs preserve dirty fields and selection during rerender',async()=>{
  const sheet=new SurvivorSheet();sheet.isEditable=true;sheet.actor={system:{}};sheet.tabGroups.primary='family';
  const inputs=[{name:'system.notes',value:'server'},{name:'system.proficiencyUuid',value:''}];sheet._draft.set('system.notes','unsaved');sheet._draft.set('system.proficiencyUuid','Item.x');
  sheet.element={querySelectorAll:s=>s==='[name]'?inputs:[],addEventListener:()=>{}};
  await sheet._onRender({},{});assert.equal(inputs[0].value,'unsaved');assert.equal(inputs[1].value,'Item.x');assert.equal(sheet.tabGroups.primary,'family');
});
test('Item proficiency form submits structured tags and derived name',async()=>{
  const {KDMItemSheet}=await import('../scripts/sheets/item.mjs');const sheet=new KDMItemSheet();sheet.item={type:'proficiency',system:{keywords:['old']}};sheet._tags=[' New ','new','Second'];
  const data=sheet._processFormData(null,null,{object:{name:'wrong',system:{type:'Sword',rank:'mastery',description:'a\nb'}}});
  assert.deepEqual(data.system.keywords,['New','Second']);assert.equal(data.name,'Sword (mastery)');assert.equal(data.system.description,'a\nb');
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
