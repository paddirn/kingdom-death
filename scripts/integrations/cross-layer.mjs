// One lifecycle wrapper per instance/method, shared by independent adapters.
// Removing either subscriber never restores over the other's wrapper.
const lifecycles = new WeakMap();
function subscribeLifecycle(layer, key, adapter) {
  if (typeof layer[key] !== 'function') return () => {};
  let entries = lifecycles.get(layer);
  if (!entries) lifecycles.set(layer, entries = new Map());
  let entry = entries.get(key);
  if (!entry) {
    const descriptor = Object.getOwnPropertyDescriptor(layer, key), original = layer[key];
    const subscribers = new Set();
    const wrapper = function(...args) {
      const current = [...subscribers];
      for (const a of current) {a.suspended++; a.restoreDisplay();}
      const finish = () => {for (const a of current) a.suspended--; for (const a of current) a.sync();};
      let result;
      try {result = original.apply(this, args);}
      catch (error) {finish(); throw error;}
      if (result?.then) return result.finally(finish);
      finish(); return result;
    };
    Object.defineProperty(layer, key, {configurable: true, writable: true, value: wrapper});
    entry = {subscribers, descriptor, wrapper}; entries.set(key, entry);
  }
  entry.subscribers.add(adapter);
  return () => {
    entry.subscribers.delete(adapter);
    if (entry.subscribers.size) return;
    if (layer[key] === entry.wrapper) {
      if (entry.descriptor) Object.defineProperty(layer, key, entry.descriptor);
      else delete layer[key];
    }
    entries.delete(key);
  };
}

/** Instance-only bridge. Never activates a canvas layer or dispatches card events. */
export class CrossLayerInteraction {
  constructor({getCanvas, available, layerKey = 'cards'}) {
    Object.assign(this, {getCanvas, available, layerKey});
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
    this.restorers.push(subscribeLifecycle(layer, key, this));
  }

  get enabled() {
    const c = this.getCanvas();
    return Boolean(!this.suspended && this.available() && c?.ready && c === this.canvas &&
      c[this.layerKey] === this.layer && c.activeLayer === c.tokens);
  }

  attach() {
    this.detach();
    const c = this.getCanvas();
    if (!this.available() || !c?.ready || !c[this.layerKey]?.objects || !c.tokens ||
        typeof c[this.layerKey].createObject !== 'function') return;
    this.canvas = c;
    this.layer = c[this.layerKey];
    const adapter = this;
    const methods = new Map();
    // Only placeable.layer sees this view. the real layer.active and canvas.activeLayer
    // stay untouched. Bind methods/accessors to the real layer (private-field safe).
    this.view = new Proxy(c[this.layerKey], {get(target, key) {
      if (key === 'active' && adapter.enabled) return true;
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function' || key === 'constructor') return value;
      if (methods.get(key)?.original !== value) methods.set(key, {original: value, bound: value.bind(target)});
      return methods.get(key).bound;
    }, set(target, key, value) {return Reflect.set(target, key, value, target);}});
    this.wrap(c[this.layerKey], 'createObject', object => this.prepare(object));
    // Public lifecycle calls preserve native ordering and return values. No activation calls.
    for (const layer of [c[this.layerKey], c.tokens]) {
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

