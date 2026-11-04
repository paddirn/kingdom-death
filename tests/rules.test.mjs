import test from "node:test";
import assert from "node:assert/strict";
import { gridCells, validateGrid, neighbors } from "../scripts/rules/gear-grid.mjs";
import { validateCampaign } from "../scripts/rules/campaign.mjs";
import { SLOTS } from "../scripts/rules/constants.mjs";
const grid = () => Object.fromEntries(SLOTS.map(s => [s, ""]));
const gear = [{id: "a", type: "gear"}, {id: "b", type: "gear"}, {id: "r", type: "resource"}];
test("grid produces exactly nine stable row-major cells", () => {
  const cells = gridCells(grid(), gear);
  assert.equal(cells.length, 9);
  assert.deepEqual(cells.map(c => [c.row,c.column]), [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]]);
});
test("two distinct copies may be equipped", () => assert.ok(validateGrid({...grid(), slot0: "a", slot8: "b"},gear)));
test("same embedded item cannot be equipped twice", () => assert.throws(() => validateGrid({...grid(),slot0:"a",slot1:"a"},gear), /two slots/));
test("resources cannot be equipped as gear", () => assert.throws(() => validateGrid({...grid(),slot0:"r"},gear), /missing gear/));
test("deletion is surfaced and can be repaired without losing other slots", () => {
  const cells = gridCells({...grid(),slot0:"deleted",slot1:"b"},gear);
  assert.equal(cells[0].missing,true); assert.equal(cells[1].item.id,"b");
  assert.ok(validateGrid({...grid(),slot1:"b"},gear));
});
test("orthogonal adjacency does not wrap rows or include diagonals", () => {
  assert.deepEqual(neighbors(0).sort(), [1,3]);
  assert.deepEqual(neighbors(2).sort(), [1,5]);
  assert.deepEqual(neighbors(4).sort(), [1,3,5,7]);
  assert.deepEqual(neighbors(8).sort(), [5,7]);
  assert.throws(() => neighbors(9), RangeError);
});
const actors = [{id:"s1",type:"survivor"},{id:"s2",type:"survivor"},{id:"m",type:"monster"}];
const campaign = () => ({phase:"settlement",party:{slot0:"s1",slot1:"s2",slot2:"",slot3:""},quarryId:"m"});
test("all three phases accept partial party and optional quarry", () => {
  for (const phase of ["settlement","hunt","showdown"]) assert.ok(validateCampaign({...campaign(),phase,quarryId:""},actors));
});
test("unknown phases are rejected", () => assert.throws(() => validateCampaign({...campaign(),phase:"combat"},actors), /Unknown/));
test("duplicate survivors rejected", () => assert.throws(() => validateCampaign({...campaign(),party:{slot0:"s1",slot1:"s1"}},actors), /only once/));
test("stale and wrong-type references rejected", () => {
  assert.throws(() => validateCampaign({...campaign(),quarryId:"s1"},actors), /quarry/);
  assert.throws(() => validateCampaign(campaign(),actors.slice(1)), /survivor/);
});
