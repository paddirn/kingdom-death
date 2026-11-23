import {CrossLayerInteraction} from './cross-layer.mjs';

function getterFor(object, key) {
  for (let current = object; current; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor.get;
  }
}

/** Share attachment/cleanup plumbing with CCM, not its rendering policy.
 * Native Tile handlers and renderers must see their genuine layer state.
 */
export class TileInteraction extends CrossLayerInteraction {
  constructor(options) {
    super({...options, layerKey: 'tiles'});
    this.debugEnabled = options.debugEnabled ?? (() => false);
  }

  attach() {
    super.attach();
    if (!this.canvas?.stage?.on) return;
    // Observe only; never stop propagation, dispatch events or alter artwork.
    const stage = this.canvas.stage;
    const pointer = event => {
      if (!this.enabled || !this.debugEnabled()) return;
      console.debug('Kingdom Death | Tile pointer routing', {
        target: event.target?.constructor?.name,
        activeLayer: this.canvas.activeLayer?.constructor?.name,
        tiles: (this.layer.placeables ?? []).map(tile => ({
          id: tile.id, visible: tile.visible, renderable: tile.renderable,
          eventMode: tile.eventMode, interactable: tile.isInteractable,
          managerState: tile.mouseInteractionManager?.state,
          ancestors: tileAncestors(tile)
        }))
      });
    };
    stage.on('pointerdown', pointer);
    this.restorers.push(() => stage.off('pointerdown', pointer));
  }

  prepare(tile) {
    if (!tile || tile.destroyed || tile.isPreview || this.cards.has(tile)) return;
    const nativeLayer = tile.layer;
    if (nativeLayer !== this.layer) return;
    const adapter = this, restorers = [];
    let gateDepth = 0;
    // Build 365 also checks layer.active inside control(), before permission
    // predicates. Scope the view to that synchronous native operation, never
    // to rendering or its _onControl follow-up. No force/permission bypass.
    const inGate = fn => function(...args) {
      gateDepth++;
      try {return fn.apply(this, args);}
      finally {gateDepth--;}
    };
    restorers.push(this.patch(tile, 'layer', {get() {
      return gateDepth && adapter.enabled && !this.isPreview ? adapter.view : nativeLayer;
    }}));
    const interactable = getterFor(tile, 'isInteractable');
    if (interactable) restorers.push(this.patch(tile, 'isInteractable', {get: inGate(interactable)}));
    for (const key of ['control','_canHover','_canControl','_canHUD','_canDrag','_canDragLeftStart','_canConfigure','_canView']) {
      if (typeof tile[key] === 'function') restorers.push(this.patch(tile,key, {value:inGate(tile[key]),writable:true}));
    }
    // A control hook can synchronously request a render. Such reentrant calls
    // must see the genuine layer, just like later render-flag processing.
    for (const key of ['_onControl','_refreshState','_refreshVisibility','_onHoverIn','_onHoverOut']) {
      const original = tile[key];
      if (typeof original !== 'function') continue;
      restorers.push(this.patch(tile,key,{value:function(...args) {
        const depth = gateDepth;
        gateDepth = 0;
        try {return original.apply(this,args);}
        finally {gateDepth = depth;}
      },writable:true}));
    }
    this.cards.set(tile, () => {for (const restore of restorers.reverse()) restore();});
    this.interactive(tile);
  }

  sync() {
    for (const [tile,restore] of this.cards) {
      if (tile.destroyed) {restore();this.cards.delete(tile);this.display.delete(tile);}
    }
    if (!this.enabled) {this.restoreDisplay();return;}
    // Build 365 hides this interaction container on deactivation. Tile meshes
    // live in PrimaryCanvasGroup, not objects. Expose controls for hit testing
    // only at lifecycle sync; never change Tile/mesh visibility, alpha or depth.
    this.setDisplay(this.layer,{eventMode:'passive',interactiveChildren:true});
    this.setDisplay(this.layer.objects,{visible:true,eventMode:'passive',interactiveChildren:true});
    for (const tile of this.layer.placeables ?? []) {this.prepare(tile);this.interactive(tile);}
  }

  refresh(tile) {
    if (tile?.layer !== this.layer) return;
    this.prepare(tile);
    this.interactive(tile);
  }
}

export function tileAncestors(tile) {
  const result = [];
  for (let object = tile.parent; object; object = object.parent) {
    result.push({type: object.constructor?.name, visible: object.visible,
      renderable: object.renderable, eventMode: object.eventMode,
      interactiveChildren: object.interactiveChildren});
  }
  return result;
}

export function registerTileIntegration() {
  const adapter = new TileInteraction({getCanvas: () => globalThis.canvas,
    debugEnabled: () => Boolean(game.settings.get('kingdom-death', 'tileInteractionDebug')),
    available: () => Boolean(game.settings.get('kingdom-death', 'tileTokenInteraction'))});
  game.settings.register('kingdom-death', 'tileInteractionDebug', {
    name: 'Debug Tile Pointer Routing', hint: 'Log pointer targets and Tile ancestor interaction state on mouse-down. For troubleshooting only.',
    scope: 'client', config: true, type: Boolean, default: false
  });
  game.settings.register('kingdom-death', 'tileTokenInteraction', {
    name: 'Enable Tile Interaction on Token Layer',
    hint: 'Use native Tile controls alongside Tokens and CCM cards. Foundry permissions and tile locks still apply.',
    scope: 'client', config: true, type: Boolean, default: true, onChange: () => adapter.attach()
  });
  Hooks.on('canvasReady', () => adapter.attach());
  Hooks.on('canvasTearDown', () => adapter.detach());
  // Reconcile pointer properties after native drawing, not inside its renderers.
  Hooks.on('drawTile', tile => adapter.refresh(tile));
  Hooks.on('refreshTile', tile => adapter.refresh(tile));
  return adapter;
}
