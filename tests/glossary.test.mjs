import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LivingGlossaryManager,assertSyncGM} from '../scripts/glossary/manager.mjs';
import {normalizeGlossary,pageContent,readGlossaryFile} from '../scripts/glossary/records.mjs';
const scope='kingdom-death';
const input = () => ({schemaVersion:1,source:{id:'original-example',url:'https://example.org/glossary'},entries:[{id:'one',title:'Example Timing',description:'Original test description.'}]});
function setup() {
  const journals=[];let sequence=0;
  const page=data=>({...structuredClone(data),id:String(++sequence),getFlag(s,k){return this.flags?.[s]?.[k];},async update(changes){Object.assign(this,structuredClone(changes));return this;}});
  const create=async data=>{
    const journal={...data,id:'journal1',pages:{contents:[]},getFlag(s,k){return this.flags?.[s]?.[k];},
      async update(data){this.flags[scope].glossary=data[`flags.${scope}.glossary`];return this;},
      async createEmbeddedDocuments(type,records){assert.equal(type,'JournalEntryPage');const created=records.map(page);this.pages.contents.push(...created);return created;}};
    journals.push(journal);return journal;
  };
  const manager=new LivingGlossaryManager({authorize:()=>{},lock:fn=>fn(),journals:()=>journals,create,now:()=> '2026-11-04T00:00:00Z'});
  return {manager,journals,page};
}
test('glossary creates, repeats, updates and renames by stable IDs, adds new pages and preserves manual pages',async()=>{
  const {manager,journals,page}=setup(),data=input();
  let report=await manager.sync(data);assert.equal(report.created,1);assert.equal(journals[0].name,'Living Glossary');
  const id=journals[0].pages.contents[0].id;
  report=await manager.sync(normalizeGlossary(data));assert.equal(report.unchanged,1);
  journals[0].pages.contents.push(page({name:'Local notes',type:'text',text:{content:'keep'}}));
  data.entries[0].title='Renamed example';data.entries[0].description='Changed original wording.';data.entries[0].updatedAt='2026-11-04';
  data.entries.push({id:'two',title:'Second example',description:'Another original note.'});
  report=await manager.sync(data);assert.equal(report.updated,1);assert.equal(report.created,1);
  assert.equal(journals[0].pages.contents[0].id,id);assert.equal(journals[0].pages.contents[1].text.content,'keep');
  assert.equal(journals[0].pages.contents.length,3);assert.equal(journals[0].flags[scope].glossary.lastSync.created,1);
  data.entries=[];report=await manager.sync(data);assert.equal(journals[0].pages.contents.length,3);
});
test('glossary rejects malformed JSON, missing fields, duplicate IDs, unknown fields and unsafe URLs before writing',async()=>{
  const {manager,journals}=setup();
  for(const mutate of [x=>x.schemaVersion=2,x=>delete x.entries[0].id,x=>x.entries.push(x.entries[0]),x=>x.source.url='javascript:alert(1)',x=>x.entries[0].html='unsafe']) {
    const data=input();mutate(data);await assert.rejects(manager.sync(data));
  }
  assert.equal(journals.length,0);
  await assert.rejects(readGlossaryFile({size:1,text:async()=>'{'}),/malformed/);
  await assert.rejects(readGlossaryFile({size:1,text:async()=>{throw Error('unavailable');}}),/inaccessible/);
  await assert.rejects(readGlossaryFile({size:6*1024*1024}),/5 MiB/);
  const data=await readGlossaryFile({size:100,text:async()=>JSON.stringify(input())});await manager.sync(data);assert.equal(journals.length,1);
});
test('glossary reports partial failures and skips conflicting page types without deleting anything',async()=>{
  const {manager,journals}=setup();await manager.sync(input());
  journals[0].pages.contents[0].type='image';
  const data=input();data.entries.push({id:'fail',title:'Fails',description:'Example failure.'});
  journals[0].createEmbeddedDocuments=async()=>{throw Error('write denied');};
  const report=await manager.sync(data);assert.equal(report.skipped,2);assert.equal(report.errors.length,2);assert.equal(journals[0].pages.contents.length,1);
});
test('journal creation failure and ambiguous names produce visible reports',async()=>{
  const {manager,journals}=setup();manager.create=async()=>{throw Error('source unavailable');};
  let report=await manager.sync(input());assert.match(report.errors[0],/unavailable/);assert.equal(report.skipped,1);
  journals.push(...[1,2].map(id=>({id,name:'Living Glossary',getFlag:()=>null})));
  report=await manager.sync(input());assert.match(report.errors[0],/Multiple/);
});
test('non-GM and non-elected GM cannot sync, and repeated concurrent requests cannot create duplicates',async()=>{
  globalThis.game={user:{isGM:false,id:'b'},users:{contents:[{id:'a',name:'Alpha',active:true,isGM:true}]}};
  assert.throws(assertSyncGM,/Only a GM/);game.user.isGM=true;assert.throws(assertSyncGM,/Alpha/);game.user.id='a';assert.doesNotThrow(assertSyncGM);
  const {manager,journals}=setup();let release;manager.lock=fn=>new Promise(resolve=>{release=()=>resolve(fn());});
  const first=manager.sync(input());await assert.rejects(manager.sync(input()),/already running/);release();await first;
  assert.equal(journals.length,1);assert.equal(manager.busy,false);
  manager.authorize=()=>{throw Error('Only a GM');};await assert.rejects(manager.sync(input()),/Only a GM/);
});
test('glossary renders imports as text, keeps provenance and ships only an original sample',()=>{
  const data=input();data.entries[0].description='<script>alert(1)</script> @UUID[Item.x]';
  const html=pageContent(normalizeGlossary(data).entries[0]);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('@UUID'));assert.match(html,/Source:/);
  const sample=JSON.parse(fs.readFileSync(new URL('../docs/glossary-example.json',import.meta.url)));assert.equal(normalizeGlossary(sample).entries.length,2);
});
test('duplicate managed page identities abort safely and failed locks release the busy guard',async()=>{
  const {manager,journals,page}=setup();await manager.sync(input());
  const original=journals[0].pages.contents[0];journals[0].pages.contents.push(page({name:original.name,type:'text',text:original.text,flags:original.flags}));
  const report=await manager.sync(input());assert.match(report.errors[0],/Duplicate managed/);assert.equal(report.created,0);
  manager.lock=async()=>{throw Error('another tab');};await assert.rejects(manager.sync(input()),/another tab/);assert.equal(manager.busy,false);
});
