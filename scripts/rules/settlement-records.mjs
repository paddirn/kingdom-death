/** Manual record layout constants; no campaign effects are applied here. */
export const YEARS=Object.freeze(Array.from({length:36},(_,i)=>`year${i+1}`));
export const MILESTONES=Object.freeze(['First child is born','First Death','Population reaches 15','5th Innovation','Population reaches 0']);
export const MONSTERS=Object.freeze({quarry:['White Lion','Screaming Antelope','The Phoenix'],nemesis:['The Butcher',"King's Man",'The Hand']});
export const PRINCIPLES=Object.freeze({life:'Life:',death:'Death:',society:'Society:',conviction:'Conviction:',other:''});
export const FLOW=Object.freeze(['Survivors return','Gain endeavors','Settlement event','Update death count','Update timeline','Develop','Choose departing survivors','Record & archive resources']);
export const rowKeys=count=>Array.from({length:count},(_,i)=>`row${i+1}`);
export const storyState=value=>(Number(value)+1)%3;
export function populationRecords(actors,user) {
  const visible=actors.filter(a=>a.type==='survivor' && a.testUserPermission(user,'OBSERVER'));
  const display=a=>({id:a.id,name:a.name+(['M','F'].includes(a.system.sex)?` (${a.system.sex})`:'')});
  const living=visible.filter(a=>a.system.dead!==true).map(display),dead=visible.filter(a=>a.system.dead===true).map(display);
  return {living,dead,deathCount:dead.length,deathBoxes:Array.from({length:40},(_,i)=>({number:i+1,checked:i<dead.length,emphasized:i===0}))};
}
export function principleRecord(key,id,items,user) {
  const item=items.find(i=>i.id===id && i.type==='innovation' && i.testUserPermission(user,'OBSERVER'));
  return {key,label:PRINCIPLES[key],id,name:item?.name ?? (id?'Missing or inaccessible Innovation':'Drop an Innovation'),available:Boolean(item)};
}
/** Button targets are allowlisted: action attributes are not arbitrary writable paths. */
export function recordControl(path) {
  if(/^system\.timeline\.year([1-9]|[12][0-9]|3[0-6])\.active$/.test(path)) return 'toggle';
  if(/^system\.timeline\.year([1-9]|[12][0-9]|3[0-6])\.storyState$/.test(path)) return 'story';
  if(/^system\.monsterTracking\.(quarry|nemesis)\.row([1-9]|10)\.levels\.level[123]$/.test(path)) return 'toggle';
  return null;
}
