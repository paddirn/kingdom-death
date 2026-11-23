import {validateBleeding} from '../rules/bleeding.mjs';
import { reconcileArmor } from '../rules/armor.mjs';
import { validateGrid } from '../rules/gear-grid.mjs';
const pending=new WeakMap();
/** Serialize this client's normal Actor writes; accounting is included in the same Actor update. */
export class KDMActor extends foundry.documents.Actor {
  update(changes, options={}) {
    const task=(pending.get(this) ?? Promise.resolve()).then(()=>super.update(changes,options));
    pending.set(this,task.catch(()=>{}));return task;
  }
  async _preCreate(data, options, user) {
    if (await super._preCreate(data,options,user) === false) return false;
    if (this.type === 'survivor' && this.system.bleeding === 5) this.updateSource({'system.dead':true});
  }
  async _preUpdate(changes,options,user) {
    if(await super._preUpdate(changes,options,user)===false) return false;
    if(this.type!=='survivor') return;
    const expanded=foundry.utils.expandObject(changes), edits=expanded.system ?? {};
    if (edits.bleeding !== undefined) {
      validateBleeding(edits.bleeding);
      if (edits.bleeding === 5 && this.system.bleeding !== 5) {
        delete changes['system.dead'];
        changes.system ??= {};
        changes.system.dead = true;
      }
    }
    const grid={...this.system.gearGrid,...edits.gearGrid};
    if(edits.gearGrid) {
      // Permit clearing legacy dangling references; validate every live assignment and new reference.
      const ids=new Set(this.items.contents.map(i=>i.id));
      const check=Object.fromEntries(Object.entries(grid).map(([key,id])=>[key,ids.has(id) || edits.gearGrid[key] ? id : ""]));
      validateGrid(check,this.items.contents);
    }
    const requested=Object.fromEntries(Object.entries(edits.locations ?? {}).filter(([,v])=>v.armor!==undefined).map(([k,v])=>[k,v.armor]));
    const {ledger,totals}=reconcileArmor(this.system,grid,this.items.contents,requested);
    // Never trust a stale/imported ledger in a normal update; derive it from current committed state.
    for(const key of Object.keys(changes)) if(key==='system.armorLedger' || key.startsWith('system.armorLedger.')) delete changes[key];
    if(changes.system) delete changes.system.armorLedger;
    if(JSON.stringify(this.system.armorLedger)!==JSON.stringify(ledger)) {
      changes.system ??= {};changes.system.armorLedger=ledger;
    }
    for(const [key,value] of Object.entries(totals)) {
      if(value===this.system.locations[key].armor && requested[key]===undefined) continue;
      changes.system ??= {};
      delete changes[`system.locations.${key}.armor`];
      changes.system.locations ??= {};
      changes.system.locations[key] ??= {};
      changes.system.locations[key].armor=value;
    }
  }
}
