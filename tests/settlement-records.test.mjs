import test from 'node:test';
import assert from 'node:assert/strict';
import {YEARS,MILESTONES,MONSTERS,PRINCIPLES,FLOW,storyState,populationRecords,principleRecord,recordControl} from '../scripts/rules/settlement-records.mjs';
const actor=(id,dead=false,visible=true)=>({id,name:'Survivor '+id,type:'survivor',system:{dead,sex:'F'},testUserPermission:()=>visible});
test('record cardinalities and Story Event cycle are exact',()=>{
 assert.equal(YEARS.length,36);assert.equal(YEARS[0],'year1');assert.equal(YEARS.at(-1),'year36');assert.equal(new Set(YEARS).size,36);
 assert.equal(MILESTONES.length,5);assert.equal(Object.keys(PRINCIPLES).length,5);assert.equal(FLOW.length,8);assert.equal(MONSTERS.quarry.length,3);assert.equal(MONSTERS.nemesis.length,3);
 let state=0;for(const next of [1,2,0,1]) {state=storyState(state);assert.equal(state,next);}
});
test('Living/Dead records and exactly forty derived death boxes obey accessible World Survivor scope',()=>{
 const a=actor('a'),b=actor('b',true),hidden=actor('secret',true,false),monster={...actor('m',true),type:'monster'};
 let c=populationRecords([a,b,hidden,monster],{});assert.equal(c.living[0].name,'Survivor a (F)');assert.equal(c.dead.length,1);assert.equal(c.deathCount,1);assert.equal(c.deathBoxes.length,40);assert.equal(c.deathBoxes.filter(b=>b.checked).length,1);
 a.system.dead=true;b.system.dead=false;b.name='Renamed';b.system.sex='M';c=populationRecords([a,b],{});assert.equal(c.living[0].name,'Renamed (M)');assert.equal(c.dead[0].id,'a');
 b.system.sex='';assert.equal(populationRecords([b],{}).living[0].name,'Renamed');
 c=populationRecords(Array.from({length:43},(_,i)=>actor(i,true)),{});assert.equal(c.deathCount,43);assert.equal(c.deathBoxes.filter(b=>b.checked).length,40);assert.equal(c.deathBoxes.filter(b=>b.emphasized).length,1);
 c=populationRecords([],{});assert.equal(c.deathCount,0);assert.ok(c.deathBoxes.every(b=>!b.checked));
});
test('Principle references resolve live owned Innovation names and tolerate missing/inaccessible Items',()=>{
 const i={id:'i',name:'First',type:'innovation',testUserPermission:()=>true};
 assert.equal(principleRecord('life','i',[i],{}).name,'First');i.name='Second';assert.equal(principleRecord('life','i',[i],{}).name,'Second');
 for(const items of [[],[{...i,type:'gear'}],[{...i,testUserPermission:()=>false}]]){const c=principleRecord('life','i',items,{});assert.equal(c.available,false);assert.equal(c.id,'i');assert.match(c.name,/Missing/);}
 assert.equal(principleRecord('other','',[],{}).label,'');
});
test('record actions reject arbitrary paths and invalid year, row, and level indices',()=>{
 for(const path of ['system.timeline.year1.active','system.timeline.year36.active','system.monsterTracking.quarry.row10.levels.level3']) assert.equal(recordControl(path),'toggle');
 assert.equal(recordControl('system.timeline.year36.storyState'),'story');
 for(const path of ['system.campaign.phase','system.timeline.year37.active','system.timeline.year0.active','system.monsterTracking.nemesis.row11.levels.level1','system.monsterTracking.quarry.row1.levels.level4','system.monsterTracking.quarry.row1.enabled']) assert.equal(recordControl(path),null);
});
