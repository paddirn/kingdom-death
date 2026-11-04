import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Handlebars from "handlebars";
// Structural test double only: not a Foundry implementation or validation test.
class Field { constructor(options = {}) { this.options = options; } }
class Schema extends Field { constructor(fields) { super(); this.fields = fields; } }
class TypeDataModel {}
class Sheet {
  _processFormData(event, form, formData) { return formData.object; }
  async _prepareContext() { return {}; }
}
const registered = [], once = new Map(), settings = [];
globalThis.foundry = {
  data: {fields: {NumberField: Field, StringField: Field, BooleanField: Field, SchemaField: Schema}},
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
