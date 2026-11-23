import test from 'node:test';
import assert from 'node:assert/strict';
const expand=object=>{const result={};for(const [path,value] of Object.entries(object)){let node=result;const keys=path.split('.');for(const key of keys.slice(0,-1)) node=node[key]??={};const key=keys.at(-1);if(value && typeof value==='object' && !Array.isArray(value)) node[key]=merge(node[key]??{},expand(value));else node[key]=value;}return result;};
function merge(target,source) {for(const [k,v] of Object.entries(source)) {if(v && typeof v==='object' && !Array.isArray(v)) merge(target[k]??={},v);else target[k]=structuredClone(v);}return target;}
class Actor {
  async _preCreate() {if(this.cancelPre) return false;}
  updateSource(changes) {merge(this,expand(changes));}
  async _preUpdate() {if(this.cancelPre) return false;}
  async update(changes,options) {
    changes=structuredClone(changes);
    if(await this._preUpdate(changes,options,{})===false || this.cancelAfter) return undefined;
    if(this.fail) throw Error('failed write');
    await Promise.resolve();this.writes.push(changes);merge(this,expand(changes));return this;
  }
}
globalThis.foundry={documents:{Actor},utils:{expandObject:expand}};
const {KDMActor}=await import('../scripts/documents/actor.mjs');
function fixture() {const a=new KDMActor();a.type='survivor';a.writes=[];a.system={gearGrid:{slot0:'',slot1:''},locations:Object.fromEntries(['head','arms','body','waist','legs'].map(k=>[k,{armor:0}]))};a.items={contents:[{id:'a',type:'armor',system:{armor:{head:3}}},{id:'b',type:'armor',system:{armor:{head:2}}}]};return a;}
test('normal flat and nested Actor updates commit grid, ledger and armor together; canceled writes grant nothing',async()=>{
  const a=fixture();for(const key of ['cancelPre','cancelAfter','fail']) {a[key]=true;try{await a.update({'system.gearGrid.slot0':'a'});}catch{}a[key]=false;assert.equal(a.system.locations.head.armor,0);assert.equal(a.system.armorLedger,undefined);}
  await a.update({'system.gearGrid.slot0':'a'});assert.equal(a.system.locations.head.armor,3);assert.equal(a.writes.length,1);
  await a.update({system:{locations:{head:{armor:1,heavy:true}}}});assert.equal(a.system.locations.head.armor,1);assert.equal(a.system.locations.head.heavy,true);assert.equal(a.items.contents[0].system.armor.head,3);
  await a.update({'system.gearGrid.slot0':''});assert.equal(a.system.locations.head.armor,0);
});
test('same-client overlapping narrow writes are serialized and a failed operation does not poison queue',async()=>{
  const a=fixture();await Promise.all([a.update({'system.gearGrid.slot0':'a'}),a.update({'system.gearGrid.slot1':'b'})]);assert.equal(a.system.locations.head.armor,5);
  a.fail=true;await assert.rejects(a.update({'system.locations.head.armor':1}),/failed/);assert.equal(a.system.locations.head.armor,5);a.fail=false;
  await a.update({'system.locations.head.armor':4});assert.equal(a.system.locations.head.armor,4);
  await a.update({'system.gearGrid.slot0':''});assert.equal(a.system.locations.head.armor,2);
});
test('native deletion cleanup and permanent stat edits reconcile current committed ledger',async()=>{
  const a=fixture();await a.update({'system.gearGrid.slot0':'a'});await a.update({'system.locations.head.armor':1});
  a.items.contents[0].system.armor.head=4;await a.update({'system.armorLedger':{}});assert.equal(a.system.locations.head.armor,2);
  a.items.contents.shift();await a.update({'system.gearGrid.slot0':''});assert.equal(a.system.locations.head.armor,0);assert.equal(a.system.armorLedger.entries.length,0);
  const writes=a.writes.length;await a.update({name:'Renamed'});assert.equal(a.writes.length,writes+1);assert.deepEqual(a.writes.at(-1),{name:'Renamed'});
});
test('duplicate grid references rejected and legacy independent protection preserved on normal updates',async()=>{
  const a=fixture();a.system.locations.head.armor=7;await a.update({name:'Old survivor'});assert.equal(a.system.locations.head.armor,7);assert.equal(a.system.armorLedger.independent.head,7);
  await assert.rejects(a.update({'system.gearGrid':{slot0:'a',slot1:'a'}}),/two slots/);assert.equal(a.system.locations.head.armor,7);
});

test('bleeding and death commit atomically for flat and nested updates; reduction never resurrects',async()=>{
  for (const nested of [false,true]) {
    const a=fixture();a.system.bleeding=0;a.system.dead=false;
    await a.update(nested ? {system:{bleeding:5,dead:false}} : {'system.bleeding':5,'system.dead':false});
    assert.equal(a.system.bleeding,5);assert.equal(a.system.dead,true);assert.equal(a.writes.length,1);
    await a.update({'system.bleeding':3});assert.equal(a.system.dead,true);
    await a.update({'system.bleeding':5});await a.update({'system.bleeding':5,'system.dead':false});
    assert.equal(a.system.dead,false,'explicit manual override when already at five');
  }
});
test('invalid macro bleeding writes reject without changing committed Actor state',async()=>{
  const a=fixture();a.system.bleeding=2;
  for(const value of [-1,6,2.5,NaN,Infinity,'5',null]) await assert.rejects(a.update({'system.bleeding':value}),/whole number/);
  assert.equal(a.system.bleeding,2);assert.equal(a.writes.length,0);
});

test('new Survivor at five bleeding is dead without a recursive update',async()=>{
  const a=fixture();a.system.bleeding=5;await a._preCreate({}, {}, {});
  assert.equal(a.system.dead,true);assert.equal(a.writes.length,0);
  const b=fixture();b.system.bleeding=5;b.cancelPre=true;assert.equal(await b._preCreate({}, {}, {}),false);assert.equal(b.system.dead,undefined);
});
