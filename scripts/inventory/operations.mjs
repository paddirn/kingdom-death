import { SLOTS } from "../rules/constants.mjs";
import { validateGrid } from "../rules/gear-grid.mjs";
const queues = new WeakMap();
export function inventoryTask(actor, operation) {
  const task=(queues.get(actor) ?? Promise.resolve()).then(()=>{
    if (!actor.isOwner) throw new Error("Ownership is required to change inventory.");
    return operation();
  });
  queues.set(actor,task.catch(()=>{})); return task;
}
export function assignGear(grid, slot, id, items) {
  if (!SLOTS.includes(slot)) throw new Error("Unknown gear slot.");
  const next={...grid};
  if (id) for (const key of SLOTS) if(next[key]===id) next[key]="";
  next[slot]=id;
  validateGrid(next,items); return next;
}
async function ownedCopy(actor, item) {
  if (item.parent?.uuid === actor.uuid && actor.items.get(item.id)) return actor.items.get(item.id);
  if (!item.testUserPermission(game.user,"OBSERVER")) throw new Error("You cannot access that Item.");
  const data=item.toObject(); delete data._id; delete data.folder;
  const [created]=await actor.createEmbeddedDocuments("Item",[data]);
  if (!created) throw new Error("Item creation was cancelled.");
  return created;
}
export function receiveItem(actor,item,slot=null) {
  return inventoryTask(actor,async()=>{
    if (slot !== null && item.type!=="gear") throw new Error("Only Gear belongs in the equipment grid.");
    if (slot !== null && !SLOTS.includes(slot)) throw new Error("Unknown gear slot.");
    const owned=await ownedCopy(actor,item);
    if (slot !== null) {
      // A failed assignment deliberately leaves the created Item in inventory, never destroys user data.
      try {
        const next=assignGear(actor.system.gearGrid,slot,owned.id,actor.items.contents);
        await actor.update({"system.gearGrid":next});
        if(actor.system.gearGrid[slot]!==owned.id) throw new Error("Gear assignment was cancelled.");
      } catch(error) { throw new Error(`${error.message} The Item remains in Inventory; drag that owned copy to retry.`); }
    }
    return owned;
  });
}
export function clearGear(actor,slot) {
  return inventoryTask(actor,()=>{
    if(!SLOTS.includes(slot)) throw new Error("Unknown gear slot.");
    // Clearing cannot introduce duplicates; permit repairing several legacy missing references one at a time.
    return actor.update({[`system.gearGrid.${slot}`]:""});
  });
}
export function deleteInventoryItem(actor,id) {
  return inventoryTask(actor,async()=>{
    const item=actor.items.get(id); if(!item) return;
    const previous={...actor.system.gearGrid};
    const changes=Object.fromEntries(SLOTS.filter(key=>previous[key]===id).map(key=>[`system.gearGrid.${key}`,""]));
    if(Object.keys(changes).length) {
      await actor.update(changes);
      if(SLOTS.some(key=>actor.system.gearGrid[key]===id)) throw new Error("Gear cleanup was cancelled; Item was not deleted.");
    }
    try {
      await item.delete();
      if(actor.items.get(id)) throw new Error("Item deletion was cancelled.");
    } catch(error) {
      // Restore only affected slots while this client's inventory queue is held.
      const restore=Object.fromEntries(SLOTS.filter(key=>previous[key]===id && !actor.system.gearGrid[key]).map(key=>[`system.gearGrid.${key}`,id]));
      if(actor.items.get(id) && Object.keys(restore).length) await actor.update(restore);
      throw error;
    }
  });
}
/** Cleanup for native/macro Item deletions outside this sheet; only the initiating owner writes. */
export function cleanupDeletedGear(actor,id) {
  return inventoryTask(actor,async()=>{
    const changes=Object.fromEntries(SLOTS.filter(key=>actor.system.gearGrid[key]===id && !actor.items.get(id)).map(key=>[`system.gearGrid.${key}`,""]));
    if(Object.keys(changes).length) await actor.update(changes);
  });
}
