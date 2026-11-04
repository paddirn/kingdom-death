/** One destination resolver for all nested Survivor Item targets. Native ActorSheetV2 resolves drop documents. */
export function dropTarget(element) { return element?.closest?.('[data-kdm-drop]') ?? null; }
export function acceptsItem(target,item,editable) {
  if(!editable || !target || item?.documentName!=="Item") return false;
  const type=target.dataset.kdmDrop;
  return type==="inventory" || (type==="gear" ? item.type==="gear" : item.type===type);
}
const handled = new WeakMap();
export function oncePerDrop(event,operation) {
  if(!handled.has(event)) handled.set(event,Promise.resolve().then(operation));
  return handled.get(event);
}
/** Capture the native payload at dragstart; browsers protect it during dragover. Never guess an unknown type. */
export function installDropFeedback(sheet) {
  sheet._dropFeedback?.abort();
  const root=sheet.element,doc=root.ownerDocument;
  if(!doc) return;
  const controller=new doc.defaultView.AbortController(), {signal}=controller;
  sheet._dropFeedback=controller;
  let item=null,active=null,generation=0;
  const clear=()=>{ active?.classList.remove('kdm-drop-valid');active=null; };
  const end=()=>{generation++;item=null;clear();};
  const show=target=>{ if(active!==target) {clear();active=target;active?.classList.add('kdm-drop-valid');} };
  const resolve=async event=>{
    const sequence=++generation;item=null;clear();
    const data=foundry.applications.ux.TextEditor.getDragEventData(event);
    if(data.type!=="Item") return;
    try {
      const resolved=await foundry.documents.Item.implementation.fromDropData(data);
      if(sequence===generation && resolved.testUserPermission(game.user,"OBSERVER")) item=resolved;
    } catch { /* Invalid or inaccessible native payload: no valid highlight. */ }
  };
  // Directory controllers may stop bubbling. Observe at each source-path node after
  // its native listeners, without stopping propagation or changing the payload.
  doc.defaultView.addEventListener('dragstart',event=>{
    let captured=false;
    const observe=sourceEvent=>{
      if(sourceEvent!==event || captured) return;
      const data=foundry.applications.ux.TextEditor.getDragEventData(sourceEvent);
      if(data.type!=="Item") return;
      captured=true; void resolve(sourceEvent);
    };
    end();
    for(const node of event.composedPath()) node.addEventListener?.('dragstart',observe,{once:true,signal});
  },{signal,capture:true});
  root.addEventListener('keydown',event=>{
    const link=event.target.closest?.('a[role="button"][data-action]');
    if(link && ['Enter',' '].includes(event.key)) {event.preventDefault();link.click();}
  },{signal});
  root.addEventListener('dragover',event=>{
    const target=dropTarget(event.target);
    if(!target) {clear();return;}
    event.preventDefault();
    const valid=acceptsItem(target,item,sheet.isEditable);
    show(valid ? target : null);
    // Unknown is not invalid: protected dragover data and asynchronous compendium lookup
    // must never veto delivery to the native drop handler. Validate the actual document there.
    if(event.dataTransfer) event.dataTransfer.dropEffect=sheet.isEditable ? 'copy' : 'none';
  },{signal});
  root.addEventListener('dragleave',event=>{
    if(active && !active.contains(event.relatedTarget)) clear();
  },{signal});
  for(const type of ['drop','dragend']) doc.addEventListener(type,end,{signal,capture:true});
  doc.addEventListener('keydown',event=>{if(event.key==='Escape') end();},{signal});
  doc.defaultView.addEventListener('blur',end,{signal});
  sheet._clearDropFeedback=end;
}
