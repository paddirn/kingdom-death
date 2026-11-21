const SYSTEM='kingdom-death';
const MODULE='complete-card-management';
/** Temporary native layer access, never synthetic card events or prototype patches. */
export class CCMAccess {
  constructor({getCanvas,available,schedule=fn=>setTimeout(fn,0)}) {Object.assign(this,{getCanvas,available,schedule});this.buttons=new Set();this.session=null;this.released=false;this.generation=0;}
  begin() {
    const c=this.getCanvas();
    if(this.session) return true;
    if(!this.available() || !c?.ready || !c.tokens || c.activeLayer!==c.tokens || !c.cards?.activate || this.buttons.size) return false;
    this.generation++;this.released=false;
    this.session={canvas:c,scene:c.scene,tokens:c.tokens,cards:c.cards};
    try {c.cards.activate();} catch(error) {this.session=null;throw error;}
    return true;
  }
  end() {if(!this.session)return false;this.released=true;this.finish();return true;}
  finish() {
    if(!this.released || this.buttons.size || !this.session)return;
    const generation=this.generation;
    this.schedule(()=>{if(generation!==this.generation || this.buttons.size || !this.released)return;this.reset(true);});
  }
  reset(restore=false) {
    const s=this.session,c=this.getCanvas();this.session=null;this.released=false;this.buttons.clear();this.generation++;
    // Do not override a manual tool/layer change or activate a stale Scene's layer.
    if(restore && s && c===s.canvas && c.ready && c.scene===s.scene && c.cards===s.cards && c.activeLayer===s.cards) s.tokens.activate();
  }
  bind(target) {
    this.unbind();this.listeners=new AbortController();const signal=this.listeners.signal;
    target.addEventListener('pointerdown',e=>{this.buttons.add(e.button);},{capture:true,signal});
    target.addEventListener('pointerup',e=>{this.buttons.delete(e.button);this.finish();},{capture:true,signal});
    target.addEventListener('pointercancel',()=>this.reset(true),{capture:true,signal});
    target.addEventListener('blur',()=>this.reset(true),{signal});
  }
  unbind() {this.listeners?.abort();this.reset(true);}
}
export function registerCCMIntegration() {
  const adapter=new CCMAccess({getCanvas:()=>globalThis.canvas,available:()=>Boolean(game.modules.get(MODULE)?.active && game.settings.get(SYSTEM,'ccmTokenInteraction'))});
  game.settings.register(SYSTEM,'ccmTokenInteraction',{name:'Enable CCM Interaction on Token Layer',hint:'Hold Alt+C from the Token layer for native CCM interaction; release to return after the pointer gesture. Requires active Complete Card Management. Shortcut is configurable in Configure Controls.',scope:'client',config:true,type:Boolean,default:true,onChange:()=>adapter.unbind()});
  game.keybindings.register(SYSTEM,'ccmTokenAccess',{name:'Temporary CCM card interaction',hint:'Hold from the Token layer. Native CCM controls take priority until released. No simultaneous-layer emulation.',editable:[{key:'KeyC',modifiers:['Alt']}],onDown:()=>{
    if(!adapter.listeners || adapter.listeners.signal.aborted)adapter.bind(window);
    return adapter.begin();
  },onUp:()=>adapter.end(),restricted:false,precedence:CONST.KEYBINDING_PRECEDENCE.NORMAL});
  Hooks.on('canvasReady',()=>adapter.bind(window));
  Hooks.on('canvasTearDown',()=>adapter.unbind());
  return adapter;
}
