import test from 'node:test';
import assert from 'node:assert/strict';
import {planParent,planChild,familyData,updateFamily} from '../scripts/family/relationships.mjs';
import {familyContext} from '../scripts/family/context.mjs';
const actor=(id,parents={})=>({id,name:id,type:'survivor',isOwner:true,system:{family:{parents:{parent1:'',parent2:'',...parents},children:[]}},testUserPermission:()=>true});
function apply(actors,updates) { for(const u of updates) actors.find(a=>a.id===u._id).system.family=u['system.family']; }
test('parent assignment, replacement and removal maintain reciprocals and stable IDs',()=>{
  const actors=[actor('a'),actor('b'),actor('c')];
  apply(actors,planParent(actors,'b','parent1','a'));
  assert.deepEqual(actors[0].system.family.children,['b']);assert.equal(actors[1].system.family.parents.parent1,'a');
  actors[0].name='Renamed';assert.equal(actors[1].system.family.parents.parent1,'a');
  apply(actors,planParent(actors,'b','parent1','c'));assert.deepEqual(actors[0].system.family.children,[]);assert.deepEqual(actors[2].system.family.children,['b']);
  apply(actors,planParent(actors,'b','parent1',''));assert.deepEqual(actors[2].system.family.children,[]);
});
test('duplicates, self, wrong types and multigeneration ancestry cycles are rejected',()=>{
  const actors=[actor('a'),actor('b'),actor('c'),{...actor('m'),type:'monster'}];
  apply(actors,planParent(actors,'b','parent1','a'));apply(actors,planParent(actors,'c','parent1','b'));
  assert.throws(()=>planParent(actors,'a','parent1','c'),/circular/);
  assert.throws(()=>planParent(actors,'a','parent1','a'),/own parent/);
  assert.throws(()=>planParent(actors,'b','parent2','a'),/already assigned/);
  assert.throws(()=>planParent(actors,'a','parent1','m'),/existing world Survivor/);
});
test('children fill free parent slots, reject full slots, replace and clear deleted links',()=>{
  const actors=[actor('a'),actor('b'),actor('c'),actor('d')];
  apply(actors,planChild(actors,'a','','c'));apply(actors,planChild(actors,'b','','c'));
  assert.equal(actors[2].system.family.parents.parent2,'b');
  assert.throws(()=>planChild(actors,'d','','c'),/two parents/);
  assert.throws(()=>planChild(actors,'a','','c'),/already assigned/);
  apply(actors,planChild(actors,'a','c','d'));
  assert.equal(actors[2].system.family.parents.parent1,'');assert.deepEqual(actors[0].system.family.children,['d']);
  actors.splice(3,1);apply(actors,planChild(actors,'a','d',''));assert.deepEqual(actors[0].system.family.children,[]);
  actors[0].system.family.parents.parent1='deleted';apply(actors,planParent(actors,'a','parent1',''));assert.equal(actors[0].system.family.parents.parent1,'');
});
test('family views show death, missing references and only visible world Survivors',()=>{
  globalThis.game={user:{}};
  const a=actor('a'),b=actor('b');a.system.family.parents.parent1='b';a.system.family.children=['gone'];b.system.dead=true;b.img='b.png';
  const view=familyContext(a,[a,b,{...actor('m'),type:'monster'},{...actor('hidden'),testUserPermission:()=>false}]);
  assert.equal(view.parents[0].dead,true);assert.equal(view.parents[0].img,'b.png');assert.equal(view.children[0].available,false);assert.equal(view.children.at(-1).add,true);
  assert.deepEqual(view.parents[0].choices.map(a=>a.id),['b']);
});
test('permission preflight makes zero writes; GM/owners can batch reciprocal updates',async()=>{
  const actors=[actor('a'),actor('b')];actors[0].isOwner=false;
  globalThis.game={actors:{contents:actors,get:id=>actors.find(a=>a.id===id)}};
  let writes=0;globalThis.foundry={documents:{Actor:{updateDocuments:async updates=>{writes++;apply(actors,updates);return updates;}}}};
  await assert.rejects(updateFamily(actors[1],'parent','parent1','a'),/Ask a GM/);assert.equal(writes,0);
  actors[0].isOwner=true;await updateFamily(actors[1],'parent','parent1','a');assert.equal(writes,1);assert.deepEqual(familyData(actors[0]).children,['b']);
});
test('interrupted reciprocal updates report an actionable error',async()=>{
  const actors=[actor('a'),actor('b')];globalThis.game={actors:{contents:actors,get:id=>actors.find(a=>a.id===id)}};
  globalThis.foundry={documents:{Actor:{updateDocuments:async updates=>apply(actors,updates.slice(0,1))}}};
  await assert.rejects(updateFamily(actors[1],'parent','parent1','a'),/interrupted.*GM/);
});
