const SYSTEM = 'kingdom-death';
export function tokenStatus(token) {
  const actor = token.actor;
  return {
    knockedDown: actor?.type === 'survivor' ? Boolean(actor.system.knockedDown)
      : actor?.type === 'monster' && Boolean(token.document.getFlag(SYSTEM,'knockedDown')),
    bleeding: actor?.type === 'survivor' ? Math.min(5,Math.max(0,Math.trunc(Number(actor.system.bleeding) || 0))) : 0
  };
}
export function statusDocument(token) {
  return token.actor?.type === 'survivor' ? token.actor : token.actor?.type === 'monster' ? token.document : null;
}
export async function toggleKnockdown(token, user) {
  const document = statusDocument(token);
  if (!document?.canUserModify(user,'update')) return false;
  await document.update({[token.actor.type === 'survivor' ? 'system.knockedDown' : 'flags.kingdom-death.knockedDown']: !tokenStatus(token).knockedDown});
  return true;
}
export function statusLayout(width,height,count) {
  const size = Math.min(width,height);
  const drop = size * 0.12, gap = size * 0.035;
  return {iconSize:size * 0.5, drops:Array.from({length:count},(_,i)=>({
    x:width/2 + (i-(count-1)/2)*(drop+gap), y:height-drop*0.65, size:drop
  }))};
}
/** Separate, non-interactive child; never changes native effects, texture or rotation. */
export class TokenStatusOverlay {
  constructor({container=()=>new PIXI.Container(),graphics=()=>new PIXI.Graphics(),
    sprite=texture=>new PIXI.Sprite(texture),load=path=>foundry.canvas.loadTexture(path),
    icon=()=>{const prone=CONFIG.statusEffects.find(e=>e.id==='prone');return prone?.img ?? prone?.icon ?? 'icons/svg/falling.svg';}}={}) {
    Object.assign(this,{container,graphics,sprite,load,icon});this.entries=new Map();
  }
  refresh(token) {
    if (!token || token.destroyed || token.isPreview) return;
    const state=tokenStatus(token), path=state.knockedDown ? this.icon() : '';
    const signature=JSON.stringify([state,token.w,token.h,path]);
    if (this.entries.get(token)?.signature===signature) return;
    this.remove(token);
    if (!state.knockedDown && !state.bleeding) return;
    const root=this.container(), entry={root,signature};
    root.eventMode='none';root.interactiveChildren=false;
    token.addChild(root);this.entries.set(token,entry);
    const layout=statusLayout(token.w,token.h,state.bleeding);
    if (state.bleeding) {
      const drawing=this.graphics();drawing.eventMode='none';root.addChild(drawing);
      for(const {x,y,size} of layout.drops) {
        drawing.lineStyle(size*0.07,0x420000,1).beginFill(0xff2020,1);
        drawing.moveTo(x,y-size*0.65);
        drawing.bezierCurveTo(x-size,y+size*0.65,x+size,y+size*0.65,x,y-size*0.65);
        drawing.endFill();
      }
    }
    if (path) Promise.resolve(this.load(path)).then(texture=>{
      if (!texture || root.destroyed || this.entries.get(token)!==entry) return;
      const image=this.sprite(texture);
      image.eventMode='none';image.anchor.set(0.5);image.position.set(token.w/2,token.h/2);
      const scale=layout.iconSize/Math.max(texture.width,texture.height);
      image.scale.set(scale);root.addChild(image);
    }).catch(error=>console.warn('Kingdom Death: unable to load prone indicator',error));
  }
  remove(token) {
    const entry=this.entries.get(token);
    if (entry && !entry.root.destroyed) {entry.root.parent?.removeChild(entry.root);entry.root.destroy({children:true});}
    this.entries.delete(token);
  }
  clear() {for(const token of this.entries.keys()) this.remove(token);}
  renderHUD(hud,html) {
    const root=html?.querySelector ? html : html?.[0], token=hud.object;
    if (!root) return;
    root.querySelector('[data-kdm-knockdown]')?.remove();
    if (!statusDocument(token)?.canUserModify(game.user,'update')) return;
    const button=root.ownerDocument.createElement('button');
    button.type='button';button.className='control-icon';button.dataset.kdmKnockdown='';
    button.title=button.dataset.tooltip='Toggle Knocked Down';
    button.setAttribute('aria-label','Toggle Knocked Down');
    button.setAttribute('aria-pressed',String(tokenStatus(token).knockedDown));
    const image=root.ownerDocument.createElement('img');image.src=this.icon();image.alt='';button.append(image);
    button.addEventListener('click',async event=>{
      event.preventDefault();event.stopPropagation();button.disabled=true;
      try {await toggleKnockdown(token,game.user);button.setAttribute('aria-pressed',String(tokenStatus(token).knockedDown));}
      catch(error) {ui.notifications.error(error.message);}
      finally {button.disabled=false;}
    });
    (root.querySelector('.col.right') ?? root).append(button);
  }
}
export function registerTokenStatus() {
  const overlay=new TokenStatusOverlay();
  const refreshAll=()=>{for(const token of canvas.tokens?.placeables ?? []) overlay.refresh(token);};
  Hooks.on('drawToken',token=>overlay.refresh(token));
  Hooks.on('refreshToken',token=>overlay.refresh(token)); // signature prevents repaint on animation frames
  Hooks.on('destroyToken',token=>overlay.remove(token));
  Hooks.on('deleteToken',document=>{if(document.object) overlay.remove(document.object);});
  Hooks.on('updateToken',document=>{if(document.object) overlay.refresh(document.object);});
  Hooks.on('updateActor',actor=>{
    for(const token of canvas.tokens?.placeables ?? []) if(token.actor===actor || token.actor?.uuid===actor.uuid) overlay.refresh(token);
  });
  Hooks.on('canvasTearDown',()=>overlay.clear());
  Hooks.on('canvasReady',()=>{overlay.clear();refreshAll();});
  Hooks.on('renderTokenHUD',(hud,html)=>overlay.renderHUD(hud,html));
  return overlay;
}
