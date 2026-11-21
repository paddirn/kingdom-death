import {cellKey, sweptProbes} from '../rules/monster-movement.mjs';

export function canViewMonster(token, user) {
  if (!token || token.destroyed || token.isPreview || token.actor?.type !== 'monster') return false;
  if (!user?.isGM && (token.document.hidden || !token.isVisible)) return false;
  return Boolean(user?.isGM || token.actor.testUserPermission?.(user, 'OBSERVER'));
}

/** Snapshot relevant documents once per recalculation, never on animation ticks. */
export function movementContext(canvas, token, user) {
  const grid = canvas.grid, doc = token.document, rect = canvas.dimensions.sceneRect;
  if (!grid?.isSquare) throw new Error('Movement range requires a square grid.');
  const width = Number(doc.width), height = Number(doc.height), movement = Number(token.actor.system.movement);
  if (![width,height,movement].every(Number.isInteger) || width < 1 || height < 1 || movement < 0 || movement > 99) {
    throw new Error('Movement range requires an integer token footprint and Movement from 0 to 99.');
  }
  const offset = grid.getOffset({x: doc.x, y: doc.y});
  const start = {x: offset.j, y: offset.i};
  const point = p => grid.getTopLeftPoint({i: p.y, j: p.x});
  const origin = point(start), zero = point({x:0,y:0}), sx = grid.sizeX, sy = grid.sizeY;
  if (Math.abs(origin.x-doc.x) > 0.1 || Math.abs(origin.y-doc.y) > 0.1) {
    throw new Error('Snap the Monster to the square grid before showing movement range.');
  }
  if (typeof token.checkCollision !== 'function') throw new Error('Native movement collision testing is unavailable.');
  const x = Math.ceil((rect.x-zero.x)/sx), y = Math.ceil((rect.y-zero.y)/sy);
  const bounds = {x,y,width: Math.floor((rect.x+rect.width-zero.x)/sx)-x,
    height: Math.floor((rect.y+rect.height-zero.y)/sy)-y};
  const range = {x: Math.max(bounds.x,start.x-movement), y: Math.max(bounds.y,start.y-movement),
    right: Math.min(bounds.x+bounds.width,start.x+width+movement),
    bottom: Math.min(bounds.y+bounds.height,start.y+height+movement)};
  const occupied = new Set();
  for (const other of canvas.tokens.placeables) {
    if (other === token || other.destroyed || other.isPreview) continue;
    const d = other.document;
    // Do not infer hidden token locations from holes in a player's overlay.
    if (!user.isGM && (d.hidden || !other.isVisible)) continue;
    if (Number(d.elevation ?? 0) !== Number(doc.elevation ?? 0)) continue;
    const left = Math.max(range.x, Math.floor((d.x-zero.x)/sx));
    const top = Math.max(range.y, Math.floor((d.y-zero.y)/sy));
    const right = Math.min(range.right, Math.ceil((d.x-zero.x)/sx+Number(d.width)));
    const bottom = Math.min(range.bottom, Math.ceil((d.y-zero.y)/sy+Number(d.height)));
    for (let row=top;row<bottom;row++) for (let col=left;col<right;col++) occupied.add(cellKey(col,row));
  }
  const segments = (canvas.walls?.placeables ?? []).map(w => w.document.c).filter(c => Array.isArray(c) && c.length === 4);
  const visible = new Map();
  const canOccupy = cell => {
    if (user.isGM || !canvas.scene.tokenVision) return true;
    const key = cellKey(cell.x,cell.y);
    if (!visible.has(key)) {
      const p = point(cell), elevation = Number(doc.elevation ?? 0);
      // No fog-exploration fallback: only current visibility, never remembered map.
      visible.set(key, [[0.01,0.01],[0.99,0.01],[0.01,0.99],[0.99,0.99],[0.5,0.5]]
        .every(([dx,dy]) => canvas.visibility?.testVisibility({x:p.x+sx*dx,y:p.y+sy*dy,elevation}, {tolerance:0}) === true));
    }
    return visible.get(key);
  };
  const canStep = (from, to) => {
    const a = point(from), b = point(to), elevation = Number(doc.elevation ?? 0);
    // Each ray still uses native movement rules (doors, wall direction, elevation).
    // In addition to center movement, sweep the entire rectangular body. Probes
    // partition at wall endpoints to catch short walls between cell centers.
    if (typeof token.constrainMovementPath === 'function') {
      const [, constrained] = token.constrainMovementPath([{...a,elevation}, {...b,elevation}]);
      if (constrained) return false;
    }
    const rays = [[{x:a.x+width*sx/2,y:a.y+height*sy/2}, {x:b.x+width*sx/2,y:b.y+height*sy/2}],
      ...sweptProbes(a,b,width*sx,height*sy,segments)];
    return rays.every(([origin,destination]) => !token.checkCollision({...destination,elevation},
      {origin:{...origin,elevation},type:'move',mode:'any'}));
  };
  return {start,width,height,movement,bounds,occupied,canOccupy,canStep,point,sizeX:sx,sizeY:sy};
}
