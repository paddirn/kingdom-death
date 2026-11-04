import test from "node:test";
import assert from "node:assert/strict";
import { CampaignController } from "../scripts/campaign/controller.mjs";
function setup({gm=true,owner=true,visible=true}={}) {
  const updates = [], settings = new Map([["activeSettlement","town"]]);
  const campaign = {phase:"settlement",party:{slot0:"",slot1:"",slot2:"",slot3:""},quarryId:""};
  const town = {id:"town",type:"settlement",isOwner:owner,testUserPermission:()=>visible,
    system:{toObject:()=>({campaign})}, update: async data => updates.push(data), sheet:{render:options=>options}};
  globalThis.game = {user:{isGM:gm},actors:{get:id=>id === "town" ? town : null, contents:[town]},
    settings:{get:(ns,k)=>settings.get(k),set:async(ns,k,v)=>settings.set(k,v)}};
  return {controller:new CampaignController(),updates,settings};
}
test("phase change persists a narrow document update", async () => {
  const {controller,updates} = setup(); await controller.setPhase("hunt");
  assert.deepEqual(updates,[{"system.campaign.phase":"hunt"}]);
});
test("invalid phase produces no document update", async () => {
  const {controller,updates} = setup(); await assert.rejects(controller.setPhase("invalid")); assert.equal(updates.length,0);
});
test("nonowners cannot alter campaign", async () => {
  const {controller,updates} = setup({gm:false,owner:false}); await assert.rejects(controller.setPhase("hunt"), /ownership/); assert.equal(updates.length,0);
});
test("only GM can change active campaign", async () => {
  const {controller} = setup({gm:false}); await assert.rejects(controller.select("town"), /GM/);
});
test("select persists only valid settlement ID", async () => {
  const {controller,settings} = setup(); await controller.select("town"); assert.equal(settings.get("activeSettlement"),"town");
  await assert.rejects(controller.select("missing"), /existing/);
});
test("inaccessible active settlement is not exposed", () => assert.equal(setup({visible:false}).controller.settlement,null));
