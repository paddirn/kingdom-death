import {reachableFootprints, footprintCells, cellKey} from '../rules/monster-movement.mjs';
import {canViewMonster, movementContext} from './movement-context.mjs';
const SYSTEM = 'kingdom-death';

export class MonsterMovementOverlay {
  constructor({getCanvas = () => globalThis.canvas, getUser = () => game.user,
    enabled = () => game.settings.get(SYSTEM,'monsterMovementOverlay'),
    opacity = () => game.settings.get(SYSTEM,'monsterMovementOpacity'),
    context = movementContext, graphics = () => new PIXI.Graphics(),
    notify = message => ui.notifications.warn(message),
    schedule = fn => setTimeout(fn, 80), cancel = id => clearTimeout(id)} = {}) {
    Object.assign(this,{getCanvas,getUser,enabled,opacity,context,graphics,notify,schedule,cancel});
    this.tokenId = null; this.sceneId = null; this.drawing = null; this.pending = null;
    this.buttons = new Map();
  }

  token() {
    const c = this.getCanvas();
    return c?.scene?.id === this.sceneId ? c.tokens?.get(this.tokenId) : null;
  }

  toggle(token) {
    if (!this.enabled() || !canViewMonster(token,this.getUser())) return false;
    if (this.tokenId === token.id && this.sceneId === this.getCanvas()?.scene?.id) {this.clear(); return true;}
    this.clear();
    this.tokenId = token.id; this.sceneId = this.getCanvas()?.scene?.id;
    this.recalculate(); this.refreshButtons(); return Boolean(this.tokenId);
  }

  toggleSelected() {
    const token = this.getCanvas()?.tokens?.controlled?.find(t => canViewMonster(t,this.getUser()));
    if (!token) {this.notify('Select a Monster token you can inspect to show its movement range.'); return false;}
    return this.toggle(token);
  }

  requestRefresh() {
    if (!this.tokenId) return;
    this.destroyDrawing(); // never leave stale geometry visible while recalculating
    if (this.pending !== null) this.cancel(this.pending);
    this.pending = this.schedule(() => {this.pending = null; this.recalculate();});
  }

  recalculate() {
    const canvas = this.getCanvas(), token = this.token();
    if (!this.enabled() || !canvas?.ready || !canViewMonster(token,this.getUser())) {this.clear(); return;}
    try {
      const context = this.context(canvas,token,this.getUser());
      const result = reachableFootprints(context);
      const current = new Set(footprintCells(context.start,context.width,context.height).map(c => cellKey(c.x,c.y)));
      this.destroyDrawing();
      const drawing = this.graphics();
      this.drawing = drawing;
      drawing.eventMode = 'none'; drawing.interactiveChildren = false;
      const alpha = Math.max(0.05,Math.min(0.6,Number(this.opacity()) || 0.22));
      // Player graphics go below the native visibility group so partial-cell
      // fog/shadows cannot be overpainted by an interface-level rectangle.
      if (!this.getUser().isGM && canvas.scene.tokenVision) {
        const visibility = canvas.visibility, parent = visibility?.parent;
        if (!parent?.addChildAt || !parent?.getChildIndex) throw new Error('Native visibility render ordering is unavailable.');
        parent.addChildAt(drawing,parent.getChildIndex(visibility));
      } else canvas.interface.addChild(drawing);
      for (const [key,cell] of result.cells) {
        if (!context.canOccupy(cell)) continue;
        const p = context.point(cell);
        drawing.beginFill(current.has(key) ? 0xabcbb6 : 0x8cbbb4,alpha);
        drawing.drawRect(p.x,p.y,context.sizeX,context.sizeY);
        drawing.endFill();
      }
      this.refreshButtons();
    } catch (error) {
      this.clear(); this.notify(`Movement range unavailable: ${error.message}`);
    }
  }

  destroyDrawing() {
    if (this.drawing && !this.drawing.destroyed) {
      this.drawing.parent?.removeChild(this.drawing); this.drawing.destroy();
    }
    this.drawing = null;
  }

  clear() {
    if (this.pending !== null) this.cancel(this.pending);
    this.pending = null; this.tokenId = this.sceneId = null;
    this.destroyDrawing(); this.refreshButtons();
  }

  refreshButtons() {
    for (const [button,token] of this.buttons) {
      if (!button.isConnected) {this.buttons.delete(button); continue;}
      const active = this.tokenId === token.id && this.sceneId === token.document.parent?.id;
      button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
      button.disabled = !this.enabled() || !canViewMonster(token,this.getUser());
    }
  }

  renderHUD(hud, html) {
    const root = html?.querySelector ? html : html?.[0];
    if (!root) return;
    root.querySelector('[data-kdm-movement]')?.remove();
    const token = hud.object;
    if (!this.enabled() || !canViewMonster(token,this.getUser())) {this.refreshButtons(); return;}
    const button = root.ownerDocument.createElement('button');
    button.type = 'button'; button.className = 'control-icon kdm-movement-toggle';
    button.dataset.kdmMovement = ''; button.dataset.tooltip = 'Show Movement Range';
    button.setAttribute('aria-label','Show Movement Range'); button.title = 'Show Movement Range';
    const icon = root.ownerDocument.createElement('i'); icon.className = 'fa-solid fa-person-walking';
    icon.setAttribute('aria-hidden','true'); button.append(icon);
    button.addEventListener('click',event => {event.preventDefault(); event.stopPropagation(); this.toggle(token);});
    (root.querySelector('.col.right') ?? root).append(button);
    this.buttons.set(button,token); this.refreshButtons();
  }

  teardown() {
    this.clear();
    for (const button of this.buttons.keys()) button.remove();
    this.buttons.clear();
  }
}

export function registerMonsterMovement() {
  const overlay = new MonsterMovementOverlay();
  game.settings.register(SYSTEM,'monsterMovementOverlay', {
    name:'Enable Monster Movement Range', hint:'Local orthogonal movement preview from the Monster token HUD.',
    scope:'client',config:true,type:Boolean,default:true,
    onChange:() => {overlay.clear(); overlay.refreshButtons();}
  });
  game.settings.register(SYSTEM,'monsterMovementOpacity', {
    name:'Monster Movement Range Opacity',scope:'client',config:true,type:Number,default:0.22,
    range:{min:0.05,max:0.6,step:0.05},onChange:() => overlay.requestRefresh()
  });
  game.keybindings.register(SYSTEM,'toggleMonsterMovement', {
    name:'Toggle Monster Movement Range',hint:'Toggle the selected Monster’s range. Also available on its token HUD.',
    editable:[],restricted:false,onDown:() => overlay.toggleSelected(),precedence:CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
  Hooks.on('renderTokenHUD',(hud,html) => overlay.renderHUD(hud,html));
  Hooks.on('canvasTearDown',() => overlay.teardown());
  Hooks.on('canvasReady',() => overlay.teardown());
  for (const name of ['createToken','updateToken','deleteToken','createWall','updateWall','deleteWall',
    'createRegion','updateRegion','deleteRegion','createRegionBehavior','updateRegionBehavior','deleteRegionBehavior']) {
    Hooks.on(name,document => {
      const scene = document.parent?.documentName === 'Region' ? document.parent.parent : document.parent;
      if (scene?.id !== overlay.sceneId) return;
      if (name === 'deleteToken' && document.id === overlay.tokenId) overlay.clear();
      else overlay.requestRefresh();
    });
  }
  Hooks.on('updateActor',actor => {if (overlay.token()?.actor?.id === actor.id) overlay.requestRefresh();});
  Hooks.on('updateScene',scene => {if (scene.id === overlay.sceneId) overlay.requestRefresh();});
  Hooks.on('deleteActor',actor => {if (overlay.token()?.actor?.id === actor.id) overlay.clear();});
  Hooks.on('updateUser',() => overlay.requestRefresh());
  Hooks.on('visibilityRefresh',() => overlay.requestRefresh());
  return overlay;
}
