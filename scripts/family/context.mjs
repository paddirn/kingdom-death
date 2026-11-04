import { familyData } from "./relationships.mjs";
export function familyContext(actor, actors) {
  const visible = actors.filter(a=>a.type==="survivor" && a.testUserPermission?.(game.user,"OBSERVER"));
  const node = id => {
    const a=visible.find(a=>a.id===id);
    return {id,name:a?.name ?? (id ? "Missing or inaccessible Survivor" : "Empty slot"),img:a?.img,dead:a?.system.dead ?? false,available:!!a,
      choices:visible.filter(a=>a.id!==actor.id).map(a=>({id:a.id,name:a.name,selected:a.id===id}))};
  };
  const data=familyData(actor);
  return {parents:Object.entries(data.parents).map(([slot,id])=>({...node(id),slot,kind:"parent"})),
    current:{id:actor.id,name:actor.name,img:actor.img,dead:actor.system.dead,available:true},
    children:[...data.children.map(id=>({...node(id),slot:id,kind:"child"})),{...node(""),slot:"",kind:"child",add:true}]};
}
