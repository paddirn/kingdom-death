import test from 'node:test';
import assert from 'node:assert/strict';
import {CCMInteraction} from '../scripts/integrations/ccm.mjs';
import {TileInteraction, registerTileIntegration} from '../scripts/integrations/tiles.mjs';

function fixture() {
  const canvas={ready:true,scene:{}};const parent={sortChildren(){this.sorts=(this.sorts??0)+1;}};
  class Layer {
    constructor(zIndex) {Object.assign(this,{zIndex,parent,active:false,eventMode:'none',interactiveChildren:false,objects:{visible:false,eventMode:'none',interactiveChildren:false},placeables:[],controlled:[]});}
    activate() {canvas.activeLayer?.deactivate();this.active=true;this.objects.visible=true;this.eventMode='passive';canvas.activeLayer=this;return this;}
    deactivate() {this.active=false;this.objects.visible=false;this.eventMode='none';return this;}
    async draw() {return this;}
    createObject() {const p=new Placeable(this);this.placeables.push(p);return p;}
  }
  class Placeable {
    constructor(layer){this.originalLayer=layer;this.hitArea={contains:()=>true};this.eventMode='none';this.isVisible=true;this.owner=true;this.document={locked:false};}
    get layer(){return this.originalLayer;}
    _refreshState() {this.eventMode='none';}
    get isInteractable(){return this.isVisible && this.layer.active;}
    _canControl(){return this.owner && this.isInteractable;}
    _canHover(){return this.isInteractable;}
    control(){if(!this.layer.active)return false;return this._canControl();}
    select(){return this.control();}
    drag(){return this.select() && !this.document.locked;}
    _onClickLeft2(){return 'configure';}
    _onClickRight(){return 'native-menu';}
    _onDragLeftDrop(){return 'native-drop';}
  }
  canvas.tokens=new Layer(100);canvas.cards=new Layer(-100);canvas.tiles=new Layer(500);
  canvas.tokens.activate(); const tile=canvas.tiles.createObject(),card=canvas.cards.createObject();
  let tileEnabled=true,cardEnabled=true;
  const tiles=new TileInteraction({getCanvas:()=>canvas,available:()=>tileEnabled});
  const ccm=new CCMInteraction({getCanvas:()=>canvas,available:()=>cardEnabled});
  return {canvas,tile,card,tiles,ccm,disableTiles(){tileEnabled=false;tiles.attach();},disableCards(){cardEnabled=false;ccm.attach();}};
}

test('Tiles reuse native handlers, locks, visibility, permissions and hit areas while Tokens remain active',()=>{
  const {canvas,tile,tiles}=fixture();const hit=tile.hitArea,menu=tile._onClickRight,drop=tile._onDragLeftDrop;
  tiles.attach();assert.equal(tile.select(),true);assert.equal(tile.drag(),true);
  assert.equal(tile._onClickLeft2(),'configure');assert.equal(tile._onClickRight,menu);assert.equal(tile._onDragLeftDrop,drop);
  tile.document.locked=true;assert.equal(tile.drag(),false);tile.document.locked=false;
  tile.owner=false;assert.equal(tile.select(),false);tile.owner=true;tile.isVisible=false;assert.equal(tile.select(),false);
  assert.equal(tile.hitArea,hit);assert.equal(canvas.activeLayer,canvas.tokens);assert.equal(canvas.tiles.active,false);
  assert.equal(canvas.tiles.eventMode,'passive');assert.equal(canvas.tiles.zIndex,500);
  tiles.detach();assert.equal(canvas.tiles.zIndex,500);assert.equal(tile.layer,canvas.tiles);
});

for (const first of ['tiles','ccm']) test(`independent cleanup: disable ${first} without removing the other Token lifecycle subscriber`,async()=>{
  const f=fixture(),{canvas,tile,card,tiles,ccm}=f;const activate=canvas.tokens.activate;
  ccm.attach();tiles.attach();
  if(first==='tiles')f.disableTiles();else f.disableCards();
  canvas.tiles.activate();canvas.tokens.activate();await canvas.tokens.draw();
  assert.equal(first==='tiles'?card.layer.active:tile.isInteractable,true);
  assert.equal(first==='tiles'?tile.isInteractable:card.layer.active,false);
  assert.equal(canvas.activeLayer,canvas.tokens);
  ccm.detach();tiles.detach();assert.equal(canvas.tokens.activate,activate);
  assert.equal(Object.hasOwn(canvas.tokens,'activate'),false);
});

test('native layer ordering and hit areas are not rewritten',()=>{
  const {canvas,tile,tiles,ccm}=fixture();const nativeArea=tile.hitArea;
  ccm.attach();tiles.attach();
  const order=[canvas.tiles,canvas.cards,canvas.tokens].sort((a,b)=>b.zIndex-a.zIndex);
  assert.deepEqual(order,[canvas.tiles,canvas.tokens,canvas.cards]);
  assert.equal(canvas.tiles.parent.sorts,undefined);
  assert.equal(tile.hitArea,nativeArea);assert.equal(canvas.tiles.objects.eventMode,'passive');
  canvas.tiles.activate();assert.equal(canvas.tiles.zIndex,500);
  canvas.tokens.activate();assert.equal(canvas.tiles.zIndex,500);
  ccm.detach();tiles.detach();
});
test('creation, refresh, redraw, deletion and canvas replacement do not retain stale Tile wrappers',async()=>{
  const {canvas,tiles,tile}=fixture();const original=canvas.tiles.createObject;
  tiles.attach();tiles.attach();const p=canvas.tiles.createObject();p._refreshState();tiles.refresh(p);
  assert.equal(p.eventMode,'static');assert.equal(p.isInteractable,true);
  await canvas.tiles.draw();assert.equal(p.isInteractable,true);
  p.destroyed=true;tiles.sync();assert.equal(tiles.cards.has(p),false);
  tiles.detach();assert.equal(tile.layer,canvas.tiles);assert.equal(canvas.tiles.createObject,original);
  assert.equal(tile.eventMode,'none');assert.equal(Object.hasOwn(p,'layer'),false);
});
test('lifecycle errors restore suspension and preserve subsequent interaction',()=>{
  const {canvas,tiles}=fixture();canvas.tokens.draw=()=>{throw new Error('native failure');};tiles.attach();
  assert.throws(()=>canvas.tokens.draw(),/native failure/);assert.equal(tiles.suspended,0);assert.equal(tiles.enabled,true);tiles.detach();
});
test('tile client setting does not depend on CCM installation or its setting',()=>{
  let config;const events=[];
  globalThis.game={settings:{register:(s,k,c)=>{if(k==='tileTokenInteraction')config=c;else {assert.equal(k,'tileInteractionDebug');assert.equal(c.default,false);}},get:(s,k)=>k==='tileTokenInteraction'}};
  globalThis.Hooks={on:(name,cb)=>events.push([name,cb])};
  const adapter=registerTileIntegration();assert.equal(adapter.available(),true);assert.equal(config.default,true);assert.equal(config.scope,'client');
  for(const [,cb]of events)cb();adapter.detach();delete globalThis.game;delete globalThis.Hooks;
});

// Rendering contract model, not a copy of Foundry's proprietary Tile renderer.
// Reproduces the old adapter's inconsistent render/preview layer contexts.
for (const kind of ['background','foreground','transparent']) test(`${kind}: native hover/render/preview sees real layer, never the permission-only view`,()=>{
  const {canvas,tile,tiles}=fixture();
  const observations=[], flags=[];
  tile.mesh={visible:true,alpha:kind==='transparent'?0.4:1,zIndex:19};
  tile.renderFlags={set:flag=>flags.push(flag)};
  tile._refreshState=function(){
    observations.push(this.layer);
    // A render-sensitive model: fake activation would diverge from the canvas.
    this.mesh.visible = this.layer.active === canvas.tiles.active;
  };
  tile._refreshVisibility=function(){observations.push(this.layer);};
  tile._onHoverIn=function(){this.hover=true;this._refreshState();this._refreshVisibility();};
  tile._onHoverOut=function(){this.hover=false;this._refreshState();};
  const originals=Object.fromEntries(['_refreshState','_refreshVisibility','_onHoverIn','_onHoverOut'].map(k=>[k,tile[k]]));
  const mesh={...tile.mesh};
  canvas.tiles.objects.visible=false; // build 365 inactive interaction container
  tiles.attach();
  assert.equal(tile.isInteractable,true);assert.equal(tile._canHover(),true);
  for(let i=0;i<3;i++) {
    tile._onHoverIn();tiles.refresh(tile);assert.deepEqual(tile.mesh,mesh);
    tile.select();tile._onHoverOut();tiles.refresh(tile);assert.deepEqual(tile.mesh,mesh);
  }
  assert.ok(observations.every(layer=>layer===canvas.tiles));
  // Render barriers delegate unchanged behavior with the genuine layer.
  assert.deepEqual(flags,[]);assert.equal(canvas.tiles.objects.visible,true);
  const preview=canvas.tiles.createObject();preview.isPreview=true;tiles.refresh(preview);
  assert.equal(preview.layer,canvas.tiles);assert.equal(preview.layer.active,false);
  canvas.tiles.activate();tile._onHoverIn();assert.deepEqual(tile.mesh,mesh);
  canvas.tokens.activate();tile._onHoverIn();assert.deepEqual(tile.mesh,mesh);
  tiles.detach();assert.deepEqual(flags,[]);assert.deepEqual(tile.mesh,mesh);
  for(const [key,original]of Object.entries(originals)) assert.equal(tile[key],original);
  assert.equal(canvas.tiles.objects.visible,false);assert.equal(canvas.tiles.zIndex,500);
  assert.equal(Object.hasOwn(tile,'layer'),false);assert.equal(Object.hasOwn(tile,'isInteractable'),false);
});

test('permission exceptions cannot leak the emulated layer into later rendering',()=>{
  const {canvas,tile,tiles}=fixture();
  tile._canHUD=function(){assert.equal(this.layer.active,true);throw new Error('denied');};
  tiles.attach();assert.throws(()=>tile._canHUD(),/denied/);
  assert.equal(tile.layer,canvas.tiles);assert.equal(tile.layer.active,false);
  tiles.detach();
});

test('native visibility changes are neither restored from stale snapshots nor forced on teardown',()=>{
  const {canvas,tile,tiles}=fixture();tile.mesh={visible:true,alpha:1};
  tiles.attach();tile.mesh.visible=false;tile.mesh.alpha=0.2;canvas.tiles.objects.visible=false;
  tiles.refresh(tile);tiles.detach();
  assert.equal(tile.mesh.visible,false);assert.equal(tile.mesh.alpha,0.2);
  assert.equal(canvas.tiles.objects.visible,false);
  tiles.attach();tiles.detach();assert.equal(tile.mesh.visible,false);
});

test('Tile diagnostics are opt-in, observation-only and listeners detach on reattachment',()=>{
  const {canvas,tiles,tile}=fixture();const listeners=new Set();
  canvas.stage={on:(name,fn)=>listeners.add(fn),off:(name,fn)=>listeners.delete(fn)};
  let debug=false;tiles.debugEnabled=()=>debug;
  const original=console.debug, logs=[];console.debug=(...args)=>logs.push(args);
  try{
    tiles.attach();assert.equal(listeners.size,1);
    for(const fn of listeners)fn({target:tile});assert.equal(logs.length,0);
    debug=true;for(const fn of listeners)fn({target:tile});assert.equal(logs.length,1);
    tiles.attach();assert.equal(listeners.size,1);assert.equal(canvas.activeLayer,canvas.tokens);
    tiles.detach();assert.equal(listeners.size,0);
  }finally{console.debug=original;}
});

test('inactive hidden container blocks routing until exposed; native control active gate remains scoped',()=>{
  const {canvas,tile,tiles}=fixture();const original=tile.control;
  const dispatch=()=>canvas.tiles.objects.visible && canvas.tiles.objects.interactiveChildren && tile.control();
  assert.equal(dispatch(),false);
  const seen=[];
  tile._refreshState=function(){seen.push(this.layer);};
  tile._onControl=function(){seen.push(this.layer);this._refreshState();};
  tile.control=function(){
    if(!this.layer.active)return false;
    if(!this._canControl())return false;
    this._onControl();this._refreshState();return true;
  };
  const control=tile.control;
  tiles.attach();assert.equal(dispatch(),true);
  assert.ok(seen.every(layer=>layer===canvas.tiles));
  assert.equal(tile.layer,canvas.tiles);assert.equal(canvas.activeLayer,canvas.tokens);
  tile.owner=false;assert.equal(dispatch(),false);
  tiles.detach();assert.equal(canvas.tiles.objects.visible,false);assert.equal(tile.control,control);
  assert.notEqual(control,original);
});

test('control failures restore layer context and visibility restores through native layer transitions',()=>{
  const {canvas,tile,tiles}=fixture();
  tile.control=function(){assert.equal(this.layer.active,true);throw Error('control failure');};
  tiles.attach();assert.throws(()=>tile.control(),/control failure/);
  assert.equal(tile.layer,canvas.tiles);
  canvas.tiles.activate();tiles.detach();assert.equal(canvas.tiles.objects.visible,true);
  canvas.tokens.activate();assert.equal(canvas.tiles.objects.visible,false);
  tiles.attach();assert.equal(canvas.tiles.objects.visible,true);
  tiles.detach();assert.equal(canvas.tiles.objects.visible,false);
});
