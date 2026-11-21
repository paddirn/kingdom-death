const SYSTEM = 'kingdom-death';
const MODULE = 'complete-card-management';

/** Instance-only bridge. Never activates a canvas layer or dispatches card events. */
export class CCMInteraction {
  constructor({getCanvas, available}) {
    Object.assign(this, {getCanvas, available});
    this.restorers = [];
    this.cards = new Map();
    this.display = new Map();
    this.suspended = 0;
  }

  /** Restore precisely the own descriptor which existed before a patch. */
  patch(object, key, descriptor) {
    const previous = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, {configurable: true, ...descriptor});
    return () => {
      if (previous) Object.defineProperty(object, key, previous);
      else delete object[key];
    };
  }

  wrap(object, key, after) {
    const original = object[key];
    if (typeof original !== 'function') return;
    this.restorers.push(this.patch(object, key, {value: function(...args) {
      const result = original.apply(this, args);
      if (result?.then) return result.then(value => {after(value); return value;});
      after(result);
      return result;
    }, writable: true}));
  }

  wrapLifecycle(layer, key) {
    const original = layer[key];
    if (typeof original !== 'function') return;
    const adapter = this;
    this.restorers.push(this.patch(layer, key, {writable: true, value: function(...args) {
      adapter.suspended++;
      adapter.restoreDisplay();
      const finish = () => {adapter.suspended--; adapter.sync();};
      let result;
      try {result = original.apply(this, args);}
      catch (error) {finish(); throw error;}
      if (result?.then) return result.finally(finish);
      finish();
      return result;
    }}));
  }

  get enabled() {
    const c = this.getCanvas();
    return Boolean(!this.suspended && this.available() && c?.ready && c === this.canvas &&
      c.cards === this.layer && c.activeLayer === c.tokens);
  }

  attach() {
    this.detach();
    const c = this.getCanvas();
    if (!this.available() || !c?.ready || !c.cards?.objects || !c.tokens ||
        typeof c.cards.createObject !== 'function') return;
    this.canvas = c;
    this.layer = c.cards;
    const adapter = this;
    const methods = new Map();
    // Only CardObject.layer sees this view. canvas.cards.active and canvas.activeLayer
    // stay untouched. Bind methods/accessors to the real layer (private-field safe).
    this.view = new Proxy(c.cards, {get(target, key) {
      if (key === 'active' && adapter.enabled) return true;
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function' || key === 'constructor') return value;
      if (methods.get(key)?.original !== value) methods.set(key, {original: value, bound: value.bind(target)});
      return methods.get(key).bound;
    }, set(target, key, value) {return Reflect.set(target, key, value, target);}});
    this.wrap(c.cards, 'createObject', object => this.prepare(object));
    // Public lifecycle calls preserve native ordering and return values. No activation calls.
    for (const layer of [c.cards, c.tokens]) {
      for (const method of ['activate', 'deactivate', 'draw']) this.wrapLifecycle(layer, method);
    }
    this.sync();
  }

  prepare(object) {
    if (!object || object.destroyed || this.cards.has(object)) return;
    const nativeLayer = object.layer;
    if (nativeLayer !== this.layer) return;
    const adapter = this;
    const restoreLayer = this.patch(object, 'layer', {get() {
      return adapter.enabled && !this.isPreview ? adapter.view : nativeLayer;
    }});
    const original = object._refreshState;
    const restoreRefresh = typeof original === 'function' ? this.patch(object, '_refreshState', {
      value: function(...args) {
        const result = original.apply(this, args);
        adapter.interactive(this);
        return result;
      }, writable: true
    }) : () => {};
    this.cards.set(object, () => {
      restoreRefresh(); restoreLayer();
      if (!object.destroyed) object.renderFlags?.set({refreshState: true});
    });
    object.renderFlags?.set({refreshState: true});
    this.interactive(object);
  }

  setDisplay(object, values) {
    if (!object || object.destroyed) return;
    if (!this.display.has(object)) this.display.set(object, {});
    const saved = this.display.get(object);
    for (const [key, value] of Object.entries(values)) {
      if (!(key in saved)) saved[key] = object[key];
      object[key] = value;
    }
  }

  interactive(object) {
    if (!this.enabled || object.isPreview) return;
    // Permission predicates and native hit areas are deliberately not replaced.
    this.setDisplay(object, {eventMode: 'static', interactiveChildren: true});
  }

  sync() {
    for (const [object, restore] of this.cards) {
      if (object.destroyed) {restore(); this.cards.delete(object); this.display.delete(object);}
    }
    if (!this.enabled) {this.restoreDisplay(); return;}
    // Passive containers cannot become empty-canvas hit targets.
    this.setDisplay(this.layer, {eventMode: 'passive', interactiveChildren: true});
    this.setDisplay(this.layer.objects, {visible: true, eventMode: 'passive', interactiveChildren: true});
    for (const object of this.layer.placeables ?? []) {this.prepare(object); this.interactive(object);}
  }

  restoreDisplay() {
    for (const [object, values] of this.display) if (!object.destroyed) Object.assign(object, values);
    this.display.clear();
  }

  detach() {
    this.restoreDisplay();
    for (const restore of this.cards.values()) restore();
    this.cards.clear();
    for (const restore of this.restorers.reverse()) restore();
    this.restorers = [];
    this.canvas = this.layer = this.view = null;
  }
}

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
