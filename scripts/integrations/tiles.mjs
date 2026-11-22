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
  constructor(options) {super({...options, layerKey: 'tiles'});}

  prepare(tile) {
    if (!tile || tile.destroyed || tile.isPreview || this.cards.has(tile)) return;
    const nativeLayer = tile.layer;
    if (nativeLayer !== this.layer) return;
    const adapter = this, restorers = [];
    let gateDepth = 0;
    // The interaction manager asks native permission predicates whether it can
    // deliver an event. Only those synchronous checks see the layer view.
    // In particular, _onHoverIn/_onHoverOut, control, clone and render methods
    // never run under an emulated activation context.
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
    for (const key of ['_canHover','_canControl','_canHUD','_canDrag','_canDragLeftStart','_canConfigure','_canView']) {
      if (typeof tile[key] === 'function') restorers.push(this.patch(tile,key, {value:inGate(tile[key]),writable:true}));
    }
    this.cards.set(tile, () => {for (const restore of restorers.reverse()) restore();});
    this.interactive(tile);
  }

  sync() {
    for (const [tile,restore] of this.cards) {
      if (tile.destroyed) {restore();this.cards.delete(tile);this.display.delete(tile);}
    }
    if (!this.enabled) {this.restoreDisplay();return;}
    // Do not set visible/renderable/alpha/zIndex or touch the artwork mesh.
    this.setDisplay(this.layer,{eventMode:'passive',interactiveChildren:true});
    this.setDisplay(this.layer.objects,{eventMode:'passive',interactiveChildren:true});
    for (const tile of this.layer.placeables ?? []) {this.prepare(tile);this.interactive(tile);}
  }

  refresh(tile) {
    if (tile?.layer !== this.layer) return;
    this.prepare(tile);
    this.interactive(tile);
  }
}

export function registerTileIntegration() {
  const adapter = new TileInteraction({getCanvas: () => globalThis.canvas,
    available: () => Boolean(game.settings.get('kingdom-death', 'tileTokenInteraction'))});
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
