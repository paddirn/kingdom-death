import {CrossLayerInteraction} from './cross-layer.mjs';

export class TileInteraction extends CrossLayerInteraction {
  constructor(options) {super({...options, layerKey: 'tiles'});}

  sync() {
    super.sync();
    if (!this.enabled) return;
    // Tile artwork stays in Foundry's primary group. Only interaction controls
    // are ordered below Token/Card controls, preserving native per-tile hit areas.
    const siblings = [this.canvas.tokens, this.canvas.cards]
      .filter(layer => layer && layer.parent === this.layer.parent);
    if (siblings.length) {
      const floor = Math.min(...siblings.map(layer => Number(layer.zIndex) || 0));
      this.setDisplay(this.layer, {zIndex: Math.min(Number(this.layer.zIndex) || 0, floor - 1)});
      this.layer.parent?.sortChildren?.();
    }
  }

  restoreDisplay() {
    const parent = this.layer?.parent;
    super.restoreDisplay();
    parent?.sortChildren?.();
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
  return adapter;
}
