import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCells,validCells,cycleCell,mergeCells,cellLabel,CELL_COUNT} from '../scripts/rules/monster-setup.mjs';
test('setup grid defaults and malformed recovery preserve valid row-major cells',()=>{
  assert.equal(CELL_COUNT,352);
  for(const input of [undefined,null,'bad',[],[2,7,-1,1.5,'3',4],Array(400).fill(2)]) {
    const result=normalizeCells(input);assert.equal(validCells(result),true);
    assert.equal(result.length,352);assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
  }
  assert.deepEqual(normalizeCells([2,7,-1,1.5,'3',4]).slice(0,6),[2,0,0,0,0,4]);
  assert.equal(validCells([0]),false);assert.equal(validCells(Array(352).fill(5)),false);
});
test('all five states cycle and edited indices merge with current remote cells',()=>{
  let state=0;const states=[];
  for(let i=0;i<5;i++){state=cycleCell(state);states.push(state);}
  assert.deepEqual(states,[1,2,3,4,0]);
  const current=normalizeCells();current[20]=4;
  assert.deepEqual(mergeCells(current,new Map([[1,2]])).slice(0,3),[0,2,0]);
  assert.equal(mergeCells(current,new Map([[1,2]]))[20],4);
  assert.equal(cellLabel(351,1,{color1:'Deployment'}),'Row 16, column 22: Deployment');
});
