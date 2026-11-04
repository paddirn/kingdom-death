import test from 'node:test';
import assert from 'node:assert/strict';
import {clampSurvival, validateSurvival} from '../scripts/rules/survival.mjs';
import {bindSurvival} from '../scripts/ui/survival.mjs';
import {nextNumber} from '../scripts/ui/numbers.mjs';
test('Survival zero, negative, limit reduction and simultaneous edits',()=>{
  for (const [input,expected] of [
    [{value:5,limit:5},{value:5,limit:5}], [{value:6,limit:5},{value:5,limit:5}],
    [{value:5,limit:3},{value:3,limit:3}], [{value:5,limit:0},{value:0,limit:0}],
    [{value:-2,limit:-1},{value:0,limit:0}], [{value:7,limit:9},{value:7,limit:9}]
  ]) {assert.deepEqual(clampSurvival(input),expected);validateSurvival(expected);}
});
test('live limit updates max, clamps typed values and emits draft input; readonly stays unchanged',()=>{
  const root=new EventTarget(),events=[],notices=[];
  root.ownerDocument={defaultView:{Event,AbortController}};
  const value={value:'5',dispatchEvent:e=>events.push(e.type)},limit={value:'3',dispatchEvent:e=>events.push(e.type)};
  root.querySelector=s=>s.includes('.value')?value:limit;
  bindSurvival(root,true,m=>notices.push(m));assert.equal(value.value,'3');assert.equal(value.max,'3');
  assert.deepEqual(events,['input']);assert.equal(notices.length,1);
  assert.equal(nextNumber(value.value,1,{min:0,max:Number(value.max)}),3);
  limit.value='0';const event=new Event('change');Object.defineProperty(event,'target',{value:limit});root.dispatchEvent(event);
  assert.equal(value.value,'0');assert.equal(value.max,'0');
  value.value='8';bindSurvival(root,false,m=>notices.push(m));assert.equal(value.value,'8');
});
