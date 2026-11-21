import test from 'node:test';
import assert from 'node:assert/strict';
import {reachableFootprints, footprintCells, sweptProbes} from '../scripts/rules/monster-movement.mjs';
import {movementContext, canViewMonster} from '../scripts/canvas/movement-context.mjs';
import {MonsterMovementOverlay, registerMonsterMovement} from '../scripts/canvas/monster-movement.mjs';
const search = overrides => reachableFootprints({start:{x:10,y:10},width:1,height:1,movement:3,
  bounds:{x:0,y:0,width:30,height:30},...overrides});

for (const [width,height,movement] of [[1,1,3],[2,2,3],[3,3,4],[2,3,3]]) {
  test(`${width}×${height} Movement ${movement}: orthogonal anchor distances and complete footprint union`, () => {
    const {destinations,cells} = search({width,height,movement});
    assert.equal(destinations.size,1+2*movement*(movement+1));
    const expected = new Set();
    for (const p of destinations.values()) {
      assert.equal(p.distance,Math.abs(p.x-10)+Math.abs(p.y-10));
      assert.ok(p.distance<=movement);
      for (const cell of footprintCells(p,width,height)) expected.add(`${cell.x},${cell.y}`);
    }
    assert.deepEqual(new Set(cells.keys()),expected);
    assert.equal(destinations.has(`${10+movement},11`),false);
  });
}
test('Movement zero and scene edges include only valid whole footprints', () => {
  assert.equal(search({width:2,height:3,movement:0}).cells.size,6);
  const r=search({start:{x:0,y:0},width:2,height:3,bounds:{x:0,y:0,width:4,height:4}});
  for (const p of r.destinations.values()) assert.ok(p.x>=0 && p.y>=0 && p.x+2<=4 && p.y+3<=4);
  assert.equal(search({width:40}).cells.size,0);
  assert.throws(()=>search({movement:Infinity})); assert.throws(()=>search({width:1.5}));
});
test('no diagonal escape or jumping intervening occupied cells', () => {
  const occupied=new Set(['9,10','11,10','10,9','10,11']);
  assert.equal(search({occupied}).destinations.size,1);
  const r=search({occupied:new Set(['11,10']),movement:2});
  assert.equal(r.destinations.has('12,10'),false);
  assert.equal(r.destinations.get('11,11').distance,2);
});
test('whole footprint blocks narrow corridors and larger destination overlaps', () => {
  const occupied=new Set(['12,11']);
  assert.equal(search({width:2,height:2,movement:1,occupied}).destinations.has('11,10'),false);
  assert.equal(search({width:1,height:1,movement:1,occupied}).destinations.has('11,10'),true);
  const canStep=(a,b)=>!(a.x===10 && b.x===11);
  assert.equal(search({movement:1,canStep}).destinations.has('11,10'),false);
  assert.equal(search({canOccupy:p=>p.x<=10}).destinations.has('11,10'),false);
});
test('swept probes partition at tiny interior wall endpoints, not just token center', () => {
  const probes=sweptProbes({x:0,y:0},{x:100,y:0},200,200,[[250,23,250,24]]);
  assert.ok(probes.some(([a,b])=>a.y===23.5 && b.y===23.5 && a.x<250 && b.x>250));
  const vertical=sweptProbes({x:0,y:0},{x:0,y:100},200,200,[[23,250,24,250]]);
  assert.ok(vertical.some(([a,b])=>a.x===23.5 && b.x===23.5 && a.y<250 && b.y>250));
});

function fixture() {
  const user={isGM:true};
  const scene={id:'scene',tokenVision:false};
  const token={id:'m',isVisible:true,document:{x:200,y:200,width:2,height:2,elevation:0,parent:scene},
    actor:{id:'a',type:'monster',system:{movement:3},testUserPermission:()=>true},
    checkCollision:()=>false,constrainMovementPath:()=>[[],false]};
  const c={ready:true,scene,dimensions:{sceneRect:{x:100,y:100,width:1000,height:800}},
    grid:{isSquare:true,sizeX:100,sizeY:100,getOffset:({x,y})=>({i:Math.floor(y/100),j:Math.floor(x/100)}),getTopLeftPoint:({i,j})=>({x:j*100,y:i*100})},
    tokens:{placeables:[token],controlled:[token],get(id){return this.placeables.find(t=>t.id===id);}},
    walls:{placeables:[]},visibility:{testVisibility:()=>true},interface:{addChild(g){g.parent=this;},removeChild(g){g.parent=null;}}};
  let enabled=true; const tasks=new Map(),notices=[],drawings=[]; let n=0;
  const controller=new MonsterMovementOverlay({getCanvas:()=>c,getUser:()=>user,enabled:()=>enabled,opacity:()=>0.22,
    schedule:f=>{tasks.set(++n,f);return n;},cancel:id=>tasks.delete(id),notify:m=>notices.push(m),
    graphics:()=>{const g={rects:[],beginFill(){},drawRect(...args){this.rects.push(args);},endFill(){},destroy(){this.destroyed=true;}};drawings.push(g);return g;}});
  return {c,user,token,controller,drawings,tasks,notices,disable(){enabled=false;},flush(){const fs=[...tasks.values()];tasks.clear();fs.forEach(f=>f());}};
}
test('native grid offset, complete blockers, hidden-token privacy and scene padding',()=>{
  const {c,token,user}=fixture();
  const blocker={isVisible:true,document:{x:400,y:300,width:1,height:1,elevation:0}};
  c.tokens.placeables.push(blocker);
  const ctx=movementContext(c,token,user);
  assert.deepEqual(ctx.bounds,{x:1,y:1,width:10,height:8});
  assert.equal(reachableFootprints(ctx).destinations.has('3,2'),false);
  user.isGM=false;blocker.document.hidden=true;
  assert.equal(movementContext(c,token,user).occupied.size,0);
  c.scene.tokenVision=true;c.visibility.testVisibility=p=>p.x<400;
  assert.equal(movementContext(c,token,user).canOccupy({x:4,y:2}),false);
});
test('native wall/elevation and movement constraint calls reject routes, missing backend fails closed',()=>{
  const {c,token,user}=fixture();const calls=[];
  token.checkCollision=(destination,options)=>{calls.push({destination,options});return destination.x>400;};
  const ctx=movementContext(c,token,user);assert.equal(ctx.canStep({x:2,y:2},{x:3,y:2}),false);
  assert.ok(calls.every(x=>x.options.type==='move' && x.options.mode==='any' && x.options.origin.elevation===0));
  token.checkCollision=()=>false;token.constrainMovementPath=()=>[[],true];
  assert.equal(movementContext(c,token,user).canStep({x:2,y:2},{x:3,y:2}),false);
  token.checkCollision=null;assert.throws(()=>movementContext(c,token,user),/unavailable/);
});
test('permission gates reject survivors, hidden monsters, missing Observer permission and previews',()=>{
  const {token,user}=fixture();user.isGM=false;assert.equal(canViewMonster(token,user),true);
  token.document.hidden=true;assert.equal(canViewMonster(token,user),false);token.document.hidden=false;
  token.isVisible=false;assert.equal(canViewMonster(token,user),false);token.isVisible=true;
  token.actor.testUserPermission=()=>false;assert.equal(canViewMonster(token,user),false);
  user.isGM=true;token.actor.type='survivor';assert.equal(canViewMonster(token,user),false);
  token.actor.type='monster';token.isPreview=true;assert.equal(canViewMonster(token,user),false);
});
test('one overlay, passive graphics, same keyboard/HUD toggle state and complete removal',()=>{
  const {c,token,controller,drawings}=fixture();
  assert.equal(controller.toggleSelected(),true);assert.equal(controller.tokenId,'m');
  assert.equal(drawings[0].eventMode,'none');assert.equal(drawings[0].interactiveChildren,false);
  assert.ok(drawings[0].rects.every(([x,y,w,h])=>x%100===0 && y%100===0 && w===100 && h===100));
  controller.toggle(token);assert.equal(controller.drawing,null);assert.equal(drawings[0].destroyed,true);
  controller.toggle(token);const second={...token,id:'m2'};c.tokens.placeables.push(second);
  controller.toggle(second);assert.equal(controller.tokenId,'m2');assert.equal(drawings[1].destroyed,true);
  controller.teardown();assert.equal(controller.tokenId,null);assert.equal(drawings.at(-1).destroyed,true);
});
test('debounced changes use fresh movement, position, dimensions and blockers; scene/deletion/disable clear state',()=>{
  const f=fixture(),{c,token,controller,tasks,flush}=f;controller.toggle(token);
  token.actor.system.movement=0;token.document.width=3;token.document.x=300;
  controller.requestRefresh();controller.requestRefresh();assert.equal(tasks.size,1);assert.equal(controller.drawing,null);
  flush();assert.equal(controller.drawing.rects.length,6);assert.equal(controller.drawing.rects[0][0],300);
  token.actor.system.movement=1;c.tokens.placeables.push({document:{x:600,y:200,width:1,height:2,elevation:0}});
  controller.requestRefresh();flush();assert.equal(controller.drawing.rects.some(r=>r[0]===600 && r[1]===200),false);
  c.scene={id:'new'};controller.requestRefresh();flush();assert.equal(controller.tokenId,null);
  c.scene=token.document.parent;controller.toggle(token);c.tokens.placeables=[];controller.requestRefresh();flush();assert.equal(controller.drawing,null);
  c.tokens.placeables=[token];controller.toggle(token);f.disable();controller.requestRefresh();flush();assert.equal(controller.tokenId,null);
});
test('off-grid or unsupported scene produces a clear message without moving token or writing documents',()=>{
  const {c,token,controller,notices}=fixture();token.document.x=201;
  assert.equal(controller.toggle(token),false);assert.match(notices[0],/Snap/);assert.equal(token.document.x,201);
  token.document.x=200;c.grid.isSquare=false;controller.toggle(token);assert.match(notices.at(-1),/square grid/);
  c.tokens.controlled=[];controller.toggleSelected();assert.match(notices.at(-1),/Select a Monster/);
});
test('registration covers relevant document and HUD hooks; shortcut is optional and shares controller',()=>{
  const hooks=new Map(),settings=new Map();let binding;
  globalThis.game={settings:{get:()=>true,register:(s,k,v)=>settings.set(k,v)},keybindings:{register:(s,k,v)=>binding=v}};
  globalThis.Hooks={on:(k,v)=>hooks.set(k,v)};globalThis.CONST={KEYBINDING_PRECEDENCE:{NORMAL:0}};
  const controller=registerMonsterMovement();let toggles=0;controller.toggleSelected=()=>{toggles++;return true;};
  binding.onDown();assert.equal(toggles,1);assert.deepEqual(binding.editable,[]);
  for(const key of ['updateToken','deleteToken','updateActor','updateWall','updateScene','visibilityRefresh','renderTokenHUD','canvasTearDown']) assert.ok(hooks.has(key));
  assert.equal(settings.get('monsterMovementOpacity').scope,'client');
  delete globalThis.game;delete globalThis.Hooks;delete globalThis.CONST;
});

test('HUD button is accessible, reflects active state, uses same toggle and rerenders without duplicates',()=>{
  const {token,controller}=fixture();
  const root={children:[],querySelector(selector){return selector==='[data-kdm-movement]'?this.children.find(c=>c.dataset?.kdmMovement!==undefined):null;},append(child){child.isConnected=true;this.children.push(child);}};
  root.ownerDocument={createElement:()=>({dataset:{},attrs:{},classList:{toggle(name,on){this[name]=on;}},
    setAttribute(name,value){this.attrs[name]=value;},append(){},addEventListener(name,fn){this[name]=fn;},
    remove(){this.isConnected=false;root.children=root.children.filter(c=>c!==this);}})};
  controller.renderHUD({object:token},root);const button=root.children[0];
  assert.equal(button.type,'button');assert.equal(button.attrs['aria-label'],'Show Movement Range');
  button.click({preventDefault(){},stopPropagation(){}});
  assert.equal(controller.tokenId,token.id);assert.equal(button.attrs['aria-pressed'],'true');
  controller.toggleSelected();assert.equal(button.attrs['aria-pressed'],'false');
  controller.renderHUD({object:token},root);assert.equal(root.children.length,1);assert.equal(controller.buttons.size,1);
  controller.teardown();assert.equal(root.children.length,0);
});

test('player graphics render below native fog; unavailable visibility ordering fails closed',()=>{
  const {c,user,token,controller,notices}=fixture();user.isGM=false;c.scene.tokenVision=true;
  let inserted;
  c.visibility.parent={getChildIndex(child){assert.equal(child,c.visibility);return 2;},
    addChildAt(graphic,index){inserted={graphic,index};graphic.parent=this;},removeChild(){}};
  controller.toggle(token);assert.equal(inserted.index,2);assert.equal(inserted.graphic,controller.drawing);
  controller.clear();delete c.visibility.parent;
  assert.equal(controller.toggle(token),false);assert.equal(controller.drawing,null);assert.match(notices.at(-1),/visibility render ordering/);
});
