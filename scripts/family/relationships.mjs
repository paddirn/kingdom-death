export const familyData = actor => ({parents: {parent1: actor.system.family?.parents?.parent1 ?? "", parent2: actor.system.family?.parents?.parent2 ?? ""}, children: [...(actor.system.family?.children ?? [])]});
/** Pure planner. World Actor IDs remain stable when names or portraits change. */
export function planParent(actors, childId, slot, parentId) {
  const world = new Map(actors.map(a => [a.id, a]));
  const child = world.get(childId);
  if (!child || child.type !== "survivor" || !["parent1", "parent2"].includes(slot)) throw new Error("Select a world Survivor and a parent slot.");
  const parent = world.get(parentId);
  if (parentId && (!parent || parent.type !== "survivor")) throw new Error("Select an existing world Survivor.");
  const next = familyData(child), previous = next.parents[slot];
  if (parentId === childId) throw new Error("A Survivor cannot be their own parent.");
  if (parentId && Object.entries(next.parents).some(([key,id]) => key !== slot && id === parentId)) throw new Error("That parent is already assigned.");
  const visited = new Set();
  const ancestor = id => {
    if (id === childId) return true;
    if (!id || visited.has(id)) return false;
    visited.add(id);
    return Object.values(familyData(world.get(id) ?? {system:{}}).parents).some(ancestor);
  };
  if (parentId && ancestor(parentId)) throw new Error("This relationship would create circular ancestry.");
  const updates = new Map();
  const edit = id => { if (!updates.has(id)) updates.set(id, familyData(world.get(id))); return updates.get(id); };
  edit(childId).parents[slot] = parentId;
  if (previous && world.has(previous)) edit(previous).children = edit(previous).children.filter(id => id !== childId);
  if (parentId) edit(parentId).children = [...new Set([...edit(parentId).children, childId])];
  return [...updates].map(([id,family]) => ({_id:id, "system.family":family}));
}
export function planChild(actors, parentId, oldChildId, childId) {
  const parent = actors.find(a => a.id === parentId);
  if (!parent || parent.type !== "survivor") throw new Error("Select a world Survivor.");
  let working = actors.map(a => ({id:a.id,type:a.type,system:{family:familyData(a)}}));
  const updates = new Map();
  const apply = changes => { for (const c of changes) { updates.set(c._id,c); working.find(a=>a.id===c._id).system.family=c["system.family"]; } };
  if (oldChildId) {
    const old = working.find(a=>a.id===oldChildId);
    const slot = old && Object.keys(old.system.family.parents).find(k=>old.system.family.parents[k]===parentId);
    if (slot) apply(planParent(working,oldChildId,slot,""));
    else { const family=familyData(working.find(a=>a.id===parentId)); family.children=family.children.filter(id=>id!==oldChildId); apply([{_id:parentId,"system.family":family}]); }
  }
  if (childId) {
    const child=working.find(a=>a.id===childId);
    if (!child || child.type!=="survivor") throw new Error("Select an existing world Survivor.");
    const parents=familyData(child).parents;
    if (Object.values(parents).includes(parentId)) throw new Error("That child is already assigned.");
    const slot=Object.keys(parents).find(k=>!parents[k]);
    if (!slot) throw new Error("This child already has two parents. Open their sheet and clear a parent slot first.");
    apply(planParent(working,childId,slot,parentId));
  }
  return [...updates.values()];
}
let pending = Promise.resolve();
export function updateFamily(actor, kind, slot, value) {
  const task = async () => {
    if (actor.isToken || !game.actors.get(actor.id)) throw new Error("Edit family relationships on the world Survivor, not an unlinked token.");
    const actors=game.actors.contents;
    const changes=kind==="parent" ? planParent(actors,actor.id,slot,value) : planChild(actors,actor.id,slot,value);
    for (const change of changes) if (!game.actors.get(change._id)?.isOwner) throw new Error("No relationship changed. Ask a GM to make this link: ownership of every affected Survivor is required.");
    let result;
    try { result=await foundry.documents.Actor.updateDocuments(changes); }
    catch (error) { throw new Error(`Family update failed. Ask a GM to inspect both Survivors before retrying: ${error.message}`); }
    // A module can cancel individual document updates. Detect this rather than silently accepting half a link.
    if (changes.some(c=>JSON.stringify(familyData(game.actors.get(c._id)))!==JSON.stringify(c["system.family"]))) {
      throw new Error("Family update was interrupted. Ask a GM to inspect both Survivors and reapply the relationship before continuing.");
    }
    return result;
  };
  const result=pending.then(task); pending=result.catch(()=>{}); return result;
}
