import {CrossLayerInteraction} from './cross-layer.mjs';
const SYSTEM = 'kingdom-death';
const MODULE = 'complete-card-management';

export class CCMInteraction extends CrossLayerInteraction {}

export function registerCCMIntegration() {
  const adapter = new CCMInteraction({getCanvas: () => globalThis.canvas,
    available: () => Boolean(game.modules.get(MODULE)?.active && game.settings.get(SYSTEM, 'ccmTokenInteraction'))});
  game.settings.register(SYSTEM, 'ccmTokenInteraction', {
    name: 'Enable CCM Interaction on Token Layer',
    hint: 'Allow native CCM card pointer interactions alongside Tokens. Requires active Complete Card Management. Runtime validation pending for Foundry 14.365.',
    scope: 'client', config: true, type: Boolean, default: true, onChange: () => adapter.attach()
  });
  Hooks.on('canvasReady', () => adapter.attach());
  Hooks.on('canvasTearDown', () => adapter.detach());
  return adapter;
}
