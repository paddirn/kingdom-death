import test from 'node:test';
import assert from 'node:assert/strict';
import { nextNumber, enhanceNumbers } from '../scripts/ui/numbers.mjs';
test('numeric steps support zero, negative modifiers, bounds and decimal alignment', () => {
  assert.equal(nextNumber(0,-1),-1);
  assert.equal(nextNumber(0,-1,{min:0}),0);
  assert.equal(nextNumber(-2,1),-1);
  assert.equal(nextNumber(5,1,{max:5}),5);
  assert.equal(nextNumber(0.2,1,{step:0.1}),0.3);
  assert.equal(nextNumber(0.25,-1,{step:0.1}),0.2);
  assert.equal(nextNumber('',1,{min:0}),1);
  assert.equal(nextNumber(4,-1,{min:2,step:2}),2);
});
test('read-only/disabled numbers have no generated buttons', () => {
  let created=0;
  const classes=new Set();
  const input={name:'system.count',value:'0',classList:{add:x=>classes.add(x)},closest:()=>null,matches:()=>true};
  const root={querySelectorAll:()=>[input],addEventListener:()=>{},ownerDocument:{createElement:()=>{created++;}}};
  enhanceNumbers(root,false,{});
  assert.equal(created,0);assert.ok(classes.has('kdm-number-display'));
});
test('existing stepper is reused and clicking emits input/change without submission', () => {
  const events=[]; let listener;
  const input={name:'system.modifier',value:'0',min:'',max:'',step:'1',readOnly:false,classList:{add(){},remove(){}},matches:()=>false,dispatchEvent:e=>events.push(e.type)};
  const wrapper={querySelector:()=>input};input.closest=()=>wrapper;
  const root={querySelectorAll:()=>[input],contains:()=>true,addEventListener:(type,fn)=>listener=fn,ownerDocument:{defaultView:{Event}}};
  enhanceNumbers(root,true,{});enhanceNumbers(root,true,{});
  let prevented=false;
  const button={dataset:{numberStep:'-1'},closest:()=>wrapper};
  listener({target:{closest:()=>button},preventDefault:()=>prevented=true});
  assert.equal(input.value,-1);assert.deepEqual(events,['input','change']);assert.equal(prevented,true);
});
