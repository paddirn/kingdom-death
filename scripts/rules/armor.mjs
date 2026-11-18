import { LOCATIONS } from './constants.mjs';
const keys=Object.keys(LOCATIONS);
const amount=value=>Math.max(0,Math.trunc(Number(value)||0));
const values=source=>Object.fromEntries(keys.map(k=>[k,amount(source?.[k])]));
/** Pure accounting: never mutate Items, source Actor data, or render-derived state. */
export function reconcileArmor(system, grid, items, requested={}) {
  const prior=system.armorLedger;
  const ledger={initialized:true, independent:values(prior?.initialized ? prior.independent : Object.fromEntries(keys.map(k=>[k,system.locations[k].armor]))), entries: prior?.initialized ? structuredClone(prior.entries ?? []) : []};
  ledger.entries.sort((a,b)=>a.itemId.localeCompare(b.itemId));
  // Reconcile recorded totals first, then explicit manual edits, before equipment changes.
  const manual=totals=>{
    for(const k of keys) {
      if(totals[k]===undefined) continue;
      const total=ledger.independent[k]+ledger.entries.reduce((n,e)=>n+e.remaining[k],0);
      let delta=amount(totals[k])-total;
      if(delta>=0) ledger.independent[k]+=delta;
      else {
        let damage=-delta;
        for(const entry of ledger.entries) {const loss=Math.min(damage,entry.remaining[k]);entry.remaining[k]-=loss;damage-=loss;}
        ledger.independent[k]=Math.max(0,ledger.independent[k]-damage);
      }
    }
  };
  manual(Object.fromEntries(keys.map(k=>[k,system.locations[k].armor])));
  manual(requested);
  const equipped=new Set(Object.values(grid).filter(Boolean));
  const armor=items.filter(i=>i.type==='armor' && equipped.has(i.id)).toSorted((a,b)=>a.id.localeCompare(b.id));
  ledger.entries=armor.map(item=>{
    const granted=values(item.system.armor), old=ledger.entries.find(e=>e.itemId===item.id);
    // Preserve damage debt even when capacity is reduced below damage already suffered.
    const damage=Object.fromEntries(keys.map(k=>[k,old ? Math.max(old.damage?.[k] ?? 0,old.granted[k]-old.remaining[k]) : 0]));
    return {itemId:item.id,granted,damage,remaining:Object.fromEntries(keys.map(k=>[k,Math.max(0,granted[k]-damage[k])]))};
  });
  const totals=Object.fromEntries(keys.map(k=>[k,ledger.independent[k]+ledger.entries.reduce((n,e)=>n+e.remaining[k],0)]));
  return {ledger,totals};
}
