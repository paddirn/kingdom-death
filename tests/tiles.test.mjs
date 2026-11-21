import test from 'node:test';
import assert from 'node:assert/strict';
import {CCMInteraction} from '../scripts/integrations/ccm.mjs';
import {TileInteraction, registerTileIntegration} from '../scripts/integrations/tiles.mjs';

function fixture() {
  const canvas={ready:true,scene:{}};const parent={sortChildren(){this.sorts=(this.sorts??0)+1;}};
  class Layer {
    constructor(zIndex) {Object.assign(this,{zIndex,parent,active:false,eventMode:'none',interactiveChildren:false,objects:{visible:true,eventMode:'none',interactiveChildren:false},placeables:[],controlled:[]});}
    activate() {canvas.activeLayer?.deactivate();this.active=true;this.eventMode='passive';canvas.activeLayer=this;return this;}
    deactivate() {this.active=false;this.eventMode='none';return this;}
    async draw() {return this;}
    createObject() {const p=new Placeable(this);this.placeables.push(p);return p;}
  }
  class Placeable {
    constructor(layer){this.originalLayer=layer;this.hitArea={contains:()=>true};this.eventMode='none';this.isVisible=true;this.owner=true;this.document={locked:false};}
    get layer(){return this.originalLayer;}
    _refreshState() {this.eventMode='none';}
    select(){return this.isVisible && this.owner && this.layer.active;}
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
  assert.equal(canvas.tiles.eventMode,'passive');assert.equal(canvas.tiles.zIndex,-101);
  tiles.detach();assert.equal(canvas.tiles.zIndex,500);assert.equal(tile.layer,canvas.tiles);
});

for (const first of ['tiles','ccm']) test(`independent cleanup: disable ${first} without removing the other Token lifecycle subscriber`,async()=>{
  const f=fixture(),{canvas,tile,card,tiles,ccm}=f;const activate=canvas.tokens.activate;
  ccm.attach();tiles.attach();
  if(first==='tiles')f.disableTiles();else f.disableCards();
  canvas.tiles.activate();canvas.tokens.activate();await canvas.tokens.draw();
  assert.equal(first==='tiles'?card.layer.active:tile.layer.active,true);
  assert.equal(first==='tiles'?tile.layer.active:card.layer.active,false);
  assert.equal(canvas.activeLayer,canvas.tokens);
  ccm.detach();tiles.detach();assert.equal(canvas.tokens.activate,activate);
  assert.equal(Object.hasOwn(canvas.tokens,'activate'),false);
});

test('native layer ordering leaves token/card targets above large background tile controls',()=>{
  const {canvas,tile,tiles,ccm}=fixture();const nativeArea=tile.hitArea;
  ccm.attach();tiles.attach();
  const order=[canvas.tiles,canvas.cards,canvas.tokens].sort((a,b)=>b.zIndex-a.zIndex);
  assert.deepEqual(order,[canvas.tokens,canvas.cards,canvas.tiles]);
  assert.equal(tile.hitArea,nativeArea);assert.equal(canvas.tiles.objects.eventMode,'passive');
  canvas.tiles.activate();assert.equal(canvas.tiles.zIndex,500);
  canvas.tokens.activate();assert.equal(canvas.tiles.zIndex,-101);
  ccm.detach();tiles.detach();
});
test('creation, refresh, redraw, deletion and canvas replacement do not retain stale Tile wrappers',async()=>{
  const {canvas,tiles,tile}=fixture();const original=canvas.tiles.createObject;
  tiles.attach();tiles.attach();const p=canvas.tiles.createObject();p._refreshState();
  assert.equal(p.eventMode,'static');assert.equal(p.layer.active,true);
  await canvas.tiles.draw();assert.equal(p.layer.active,true);
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
  globalThis.game={settings:{register:(s,k,c)=>{assert.equal(k,'tileTokenInteraction');config=c;},get:(s,k)=>k==='tileTokenInteraction'}};
  globalThis.Hooks={on:(name,cb)=>events.push([name,cb])};
  const adapter=registerTileIntegration();assert.equal(adapter.available(),true);assert.equal(config.default,true);assert.equal(config.scope,'client');
  for(const [,cb]of events)cb();adapter.detach();delete globalThis.game;delete globalThis.Hooks;
});
