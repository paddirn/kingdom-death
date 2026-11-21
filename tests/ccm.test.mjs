import test from 'node:test';
import assert from 'node:assert/strict';
import {CCMInteraction, registerCCMIntegration} from '../scripts/integrations/ccm.mjs';

// Contract doubles, NOT a substitute for V14's MouseInteractionManager or PIXI.
function fixture() {
  let available = true;
  const c = {ready: true, scene: {}};
  const nativeCalls = [];
  class Layer {
    #secret = 42;
    active = false;
    eventMode = 'none';
    interactiveChildren = false;
    objects = {visible: true, eventMode: 'none', interactiveChildren: false};
    placeables = [];
    controlled = [];
    preview = {};
    get secret() {return this.#secret;}
    privateMethod() {return this.#secret;}
    activate() {c.activeLayer?.deactivate(); this.active = true; c.activeLayer = this; this.eventMode = 'passive'; return this;}
    deactivate() {this.active = false; this.eventMode = 'none'; return this;}
    async draw() {return this;}
    createObject() {const object = new Card(this); this.placeables.push(object); return object;}
  }
  class Card {
    constructor(layer) {this.nativeLayer = layer;}
    get layer() {return this.nativeLayer;}
    eventMode = 'none';
    interactiveChildren = false;
    isPreview = false;
    visible = true;
    owner = true;
    get isInteractable() {return this.layer.active && this.visible && !this.isPreview;}
    _refreshState() {nativeCalls.push('refresh');}
    control() {if (!this.isInteractable || !this.owner) return false; this.layer.controlled.push(this); return true;}
    _onClickLeft2() {nativeCalls.push('view');}
    _onDragLeftDrop() {nativeCalls.push('native-drop');}
  }
  c.tokens = new Layer(); c.cards = new Layer(); c.tokens.activate();
  const card = c.cards.createObject();
  const adapter = new CCMInteraction({getCanvas: () => c, available: () => available});
  return {c, card, adapter, nativeCalls, disable() {available = false;}};
}

test('card layer view supports native control without changing active layer, handlers or real layer state', () => {
  const {c, card, adapter, nativeCalls} = fixture();
  const drop = card._onDragLeftDrop, view = card._onClickLeft2;
  adapter.attach();
  assert.equal(c.activeLayer, c.tokens); assert.equal(c.cards.active, false);
  assert.equal(card.layer.active, true); assert.equal(card.control(), true);
  assert.equal(c.cards.controlled[0], card); assert.equal(card.layer.preview, c.cards.preview);
  assert.equal(card.layer.secret, 42); assert.equal(card.layer.privateMethod(), 42);
  assert.equal(card._onDragLeftDrop, drop); assert.equal(card._onClickLeft2, view);
  card._onClickLeft2(); card._onDragLeftDrop();
  assert.deepEqual(nativeCalls, ['view', 'native-drop']);
  assert.equal(c.activeLayer, c.tokens);
  adapter.detach(); assert.equal(card.layer, c.cards); assert.equal(card.eventMode, 'none');
});

test('native visibility and ownership gates remain authoritative; previews use real layer', () => {
  const {c, card, adapter} = fixture(); adapter.attach();
  card.owner = false; assert.equal(card.control(), false);
  card.owner = true; card.visible = false; assert.equal(card.control(), false);
  card.visible = true; card.isPreview = true;
  assert.equal(card.layer, c.cards); assert.equal(card.control(), false);
  assert.equal(c.cards.eventMode, 'passive'); // no empty-canvas target added
  adapter.detach();
});

test('new cards, refreshes, redraw and repeated attach preserve one wrapper and clean teardown', async () => {
  const {c, card, adapter} = fixture(); const original = c.cards.createObject;
  adapter.attach(); adapter.attach();
  const created = c.cards.createObject(); assert.equal(created.layer.active, true);
  created.eventMode = 'none'; created._refreshState(); assert.equal(created.eventMode, 'static');
  await c.cards.draw(); assert.equal(card.layer.active, true);
  created.destroyed = true; adapter.sync(); assert.equal(adapter.cards.has(created), false);
  adapter.detach(); assert.equal(c.cards.createObject, original);
  assert.equal(Object.hasOwn(card, 'layer'), false);
  assert.equal(Object.hasOwn(card, '_refreshState'), false);
});

test('normal layer switches restore native state, then re-enable only alongside Tokens', () => {
  const {c, card, adapter} = fixture(); adapter.attach();
  c.cards.activate();
  assert.equal(c.activeLayer, c.cards); assert.equal(c.cards.eventMode, 'passive');
  assert.equal(card.layer, c.cards);
  c.tokens.activate(); assert.equal(card.layer.active, true); assert.equal(c.cards.active, false);
  c.tokens.deactivate(); c.activeLayer = {};
  adapter.sync(); assert.equal(card.layer, c.cards); assert.equal(card.eventMode, 'none');
  adapter.detach();
});

test('absent CCM, setting disable and scene replacement leave no patched old objects', () => {
  const {c, card, adapter, disable} = fixture(); adapter.attach();
  disable(); adapter.attach(); assert.equal(card.layer, c.cards); assert.equal(adapter.cards.size, 0);
  adapter.attach(); assert.equal(card.eventMode, 'none');
  const other = fixture(); other.adapter.attach(); const old = other.c.cards;
  other.c.cards = null; other.adapter.attach();
  assert.equal(other.card.layer, old); assert.equal(other.card.eventMode, 'none');
});

test('registration installs no hotkey, DOM pointer listeners or layer switching actions', () => {
  const events = []; let setting;
  globalThis.game = {modules: new Map(), settings: {register: (_s, _k, data) => {setting = data;}, get: () => true}};
  globalThis.Hooks = {on: (name, callback) => events.push([name, callback])};
  const adapter = registerCCMIntegration();
  assert.equal(setting.scope, 'client'); assert.equal(setting.default, true);
  assert.deepEqual(events.map(([name]) => name), ['canvasReady', 'canvasTearDown']);
  for (const [, callback] of events) callback();
  adapter.detach(); delete globalThis.game; delete globalThis.Hooks;
});
