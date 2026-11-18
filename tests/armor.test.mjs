import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileArmor} from '../scripts/rules/armor.mjs';
import {assignGear} from '../scripts/inventory/operations.mjs';
import {validateGrid,gridCells} from '../scripts/rules/gear-grid.mjs';
const locations=['head','arms','body','waist','legs'];
const item=(id,armor)=>({id,type:'armor',system:{armor}});
const initial=()=>({locations:Object.fromEntries(locations.map(k=>[k,{armor:0}])),gearGrid:{}});
function apply(s,grid,items,manual={}) {const {ledger,totals}=reconcileArmor(s,grid,items,manual);return {...s,gearGrid:grid,armorLedger:ledger,locations:Object.fromEntries(locations.map(k=>[k,{armor:totals[k]}]))};}
test('legacy armor remains independent, inventory alone grants nothing; every slot accepts Armor',()=>{
  const s=initial();s.locations.head.armor=5;const a=item('a',{head:3});
  assert.equal(apply(s,{},[a]).locations.head.armor,5);
  for(let n=0;n<9;n++) {const grid=assignGear({},`slot${n}`,'a',[a]);const next=apply(s,grid,[a]);assert.equal(next.locations.head.armor,8);assert.equal(next.armorLedger.independent.head,5);assert.equal(gridCells(grid,[a])[n].item,a);}
  assert.throws(()=>validateGrid({slot0:'a',slot1:'a'},[a]),/two slots/);
});
test('stacking, damage, reload, rerender purity, move and partial unequip preserve Item properties',()=>{
  const items=[item('b',{head:2,body:2}),item('a',{head:3,body:2})];const before=structuredClone(items);
  let s=apply(initial(),{slot0:'a',slot1:'b'},items);assert.equal(s.locations.body.armor,4);
  s=apply(s,s.gearGrid,items,{head:2,body:3});assert.equal(s.armorLedger.entries[0].remaining.head,0);assert.equal(s.armorLedger.entries[0].remaining.body,1);
  const saved=JSON.stringify(s);const moved=assignGear(s.gearGrid,'slot8','a',items);s=apply(JSON.parse(saved),moved,items);assert.equal(s.locations.head.armor,2);assert.deepEqual(items,before);
  const snap=structuredClone(s);reconcileArmor(s,s.gearGrid,items);assert.deepEqual(s,snap);
  s=apply(s,{slot1:'b'},items);assert.equal(s.locations.body.armor,2);assert.equal(s.locations.head.armor,2);
  s=apply(s,{},items);assert.equal(s.locations.body.armor,0);
});
test('three protection, two damage, unequip removes only one; manual additions stay independent',()=>{
  const a=item('a',{head:3});let s=apply(initial(),{slot0:'a'},[a]);s=apply(s,s.gearGrid,[a],{head:1});
  s=apply(s,s.gearGrid,[a],{head:4});assert.equal(s.armorLedger.independent.head,3);
  s=apply(s,{},[a]);assert.equal(s.locations.head.armor,3);
  s=apply(s,{},[a],{head:0});assert.equal(s.locations.head.armor,0);
});
test('equipped stat edits preserve damage debt, deletion and repeated reconciliation do not repair',()=>{
  let a=item('a',{head:3}),s=apply(initial(),{slot0:'a'},[a]);s=apply(s,s.gearGrid,[a],{head:1});
  a=item('a',{head:1});s=apply(s,s.gearGrid,[a]);assert.equal(s.locations.head.armor,0);
  a=item('a',{head:4});s=apply(s,s.gearGrid,[a]);assert.equal(s.locations.head.armor,2);
  s=apply(s,s.gearGrid,[a]);assert.equal(s.locations.head.armor,2);
  s=apply(s,{},[]);assert.equal(s.locations.head.armor,0);assert.equal(s.armorLedger.entries.length,0);
});
test('damage order uses stable IDs, independent armor depleted last; reversing Items has no effect',()=>{
  const items=[item('z',{body:2}),item('a',{body:2})];let s=initial();s.locations.body.armor=2;s=apply(s,{slot0:'z',slot1:'a'},items);
  const first=apply(s,s.gearGrid,items,{body:3}),second=apply(s,s.gearGrid,items.toReversed(),{body:3});assert.deepEqual(first,second);assert.equal(first.armorLedger.independent.body,2);assert.equal(first.armorLedger.entries[1].remaining.body,1);
});
