import test from 'node:test';
import assert from 'node:assert/strict';
import {TokenStatusOverlay,tokenStatus,toggleKnockdown,statusLayout} from '../scripts/canvas/token-status.mjs';
import {migrateBleeding,validateBleeding} from '../scripts/rules/bleeding.mjs';
class Container {
  children=[];eventMode='static';
  addChild(child) {this.children.push(child);child.parent=this;return child;}
  removeChild(child) {this.children=this.children.filter(x=>x!==child);}
  destroy() {this.destroyed=true;}
}
class Graphic extends Container {
  lineStyle(){return this;}beginFill(){return this;}moveTo(){return this;}bezierCurveTo(){return this;}endFill(){return this;}
}
function fixture(type='survivor') {
  const token=new Container();token.w=token.h=100;
  token.actor={type,system:{knockedDown:false,bleeding:0},canUserModify:()=>true,async update(data){this.updates=data;for(const [k,v] of Object.entries(data))this.system[k.split('.').at(-1)]=v;}};
  token.document={canUserModify:()=>true,getFlag(){return this.flag;},async update(data){this.updates=data;this.flag=data['flags.kingdom-death.knockedDown'];}};
  return token;
}
test('linked and synthetic Survivor toggles write their associated actor, Monster writes only token flag',async()=>{
  const token=fixture(),linked=fixture();linked.actor=token.actor;
  await toggleKnockdown(token,{});assert.equal(tokenStatus(linked).knockedDown,true);
  const synthetic=fixture();await toggleKnockdown(synthetic,{});await toggleKnockdown(synthetic,{});
  assert.equal(tokenStatus(synthetic).knockedDown,false);assert.equal(tokenStatus(linked).knockedDown,true);
  const monster=fixture('monster');await toggleKnockdown(monster,{});
  assert.equal(tokenStatus(monster).knockedDown,true);assert.equal(monster.actor.updates,undefined);
  monster.document.canUserModify=()=>false;assert.equal(await toggleKnockdown(monster,{}),false);
});
test('half-size icon and centered bottom drops scale with rectangular and large tokens',()=>{
  for(const [w,h] of [[100,100],[200,200],[300,200]]) for(let n=0;n<=5;n++){
    const layout=statusLayout(w,h,n);assert.equal(layout.iconSize,Math.min(w,h)/2);
    assert.equal(layout.drops.length,n);
    if(n) assert.equal((layout.drops[0].x+layout.drops.at(-1).x)/2,w/2);
    for(const drop of layout.drops)assert.ok(drop.y>h/2 && drop.y<h);
  }
});
test('overlay signatures avoid duplicate painting; race-safe image loading and teardown preserve native children',async()=>{
  const token=fixture(),native=new Container();token.addChild(native);
  let resolve;const overlay=new TokenStatusOverlay({container:()=>new Container(),graphics:()=>new Graphic(),
    icon:()=> 'prone.svg',load:()=>new Promise(r=>resolve=r),
    sprite:()=>({anchor:{set(){}},position:{set(){}},scale:{set(){}}})});
  token.actor.system={bleeding:5,knockedDown:true};overlay.refresh(token);
  const root=overlay.entries.get(token).root;assert.equal(root.eventMode,'none');assert.equal(root.interactiveChildren,false);
  assert.equal(root.children.length,1);overlay.refresh(token);assert.equal(token.children.length,2);
  resolve({width:100,height:50});await Promise.resolve();assert.equal(root.children.length,2);
  token.w=200;overlay.refresh(token);assert.equal(root.destroyed,true);assert.equal(token.children.length,2);
  overlay.clear();resolve({width:50,height:50});await Promise.resolve();assert.deepEqual(token.children,[native]);assert.equal(overlay.entries.size,0);
});
test('all bleeding counts render requested drop counts and coexist with knockdown',()=>{
  const token=fixture();
  for(let n=0;n<=5;n++){token.actor.system.bleeding=n;token.actor.system.knockedDown=true;assert.deepEqual(tokenStatus(token),{bleeding:n,knockedDown:true});}
});
test('legacy bleeding migration preserves valid sources and backs up invalid values idempotently',()=>{
  for(let n=0;n<=5;n++){const source={bleeding:n,dead:false};assert.deepEqual(migrateBleeding({...source}),source);assert.equal(validateBleeding(n),n);}
  for(const [old,value] of [[8,5],[-1,0],[2.5,2],['bad',0]]) {
    const result=migrateBleeding({bleeding:old});assert.equal(result.bleeding,value);assert.equal(result.legacyBleeding,String(old));
    assert.deepEqual(migrateBleeding({...result}),result);if(value===5)assert.equal(result.dead,true);
  }
  assert.deepEqual(migrateBleeding({}),{});
});
test('native HUD gets a permission-checked toggle and rerender replaces the prior control',async()=>{
  const token=fixture();globalThis.game={user:{}};
  const buttons=[];const root={ownerDocument:{createElement:()=>({dataset:{},setAttribute(k,v){this[k]=v;},append(){},addEventListener(type,fn){this.click=fn;},remove(){buttons.splice(buttons.indexOf(this),1);}})},
    querySelector:selector=>selector==='[data-kdm-knockdown]' ? buttons[0] : {append:button=>buttons.push(button)}};
  const overlay=new TokenStatusOverlay({icon:()=> 'prone.svg'});
  overlay.renderHUD({object:token},root);assert.equal(buttons.length,1);assert.equal(buttons[0].title,'Toggle Knocked Down');
  await buttons[0].click({preventDefault(){},stopPropagation(){}});assert.equal(token.actor.system.knockedDown,true);
  overlay.renderHUD({object:token},root);assert.equal(buttons.length,1);
  token.actor.canUserModify=()=>false;overlay.renderHUD({object:token},root);assert.equal(buttons.length,0);
  delete globalThis.game;
});
