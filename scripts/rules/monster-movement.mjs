/** Grid coordinates use x=column, y=row. No Foundry or PIXI dependency. */
export const cellKey = (x, y) => `${x},${y}`;
export function footprintCells({x, y}, width, height) {
  const cells = [];
  for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) cells.push({x: x + dx, y: y + dy});
  return cells;
}

export function reachableFootprints({start, width, height, movement, bounds, occupied = new Set(),
  canOccupy = () => true, canStep = () => true}) {
  if (![start.x, start.y, width, height, movement, bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isInteger) ||
      width < 1 || height < 1 || movement < 0 || movement > 99) throw new Error('Expected aligned integer footprint and Movement 0–99.');
  const inside = p => p.x >= bounds.x && p.y >= bounds.y &&
    p.x + width <= bounds.x + bounds.width && p.y + height <= bounds.y + bounds.height;
  const destinations = new Map(), cells = new Map();
  if (!inside(start)) return {destinations, cells};
  const add = (p, distance) => {
    destinations.set(cellKey(p.x, p.y), {...p, distance});
    for (const cell of footprintCells(p, width, height)) cells.set(cellKey(cell.x, cell.y), cell);
  };
  add(start, 0); // Movement 0 still shows the existing occupied area.
  const queue = [{...start, distance: 0}], allowed = new Map();
  for (let index = 0; index < queue.length; index++) {
    const from = queue[index];
    if (from.distance >= movement) continue;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const to = {x: from.x + dx, y: from.y + dy}, key = cellKey(to.x, to.y);
      if (destinations.has(key) || !inside(to)) continue;
      if (!allowed.has(key)) allowed.set(key, footprintCells(to, width, height)
        .every(c => !occupied.has(cellKey(c.x, c.y)) && canOccupy(c)));
      if (!allowed.get(key) || !canStep(from, to)) continue;
      const distance = from.distance + 1;
      add(to, distance); queue.push({...to, distance});
    }
  }
  return {destinations, cells};
}

/** Collision probes cover the swept rectangle, including tiny walls wholly
 * inside it. Partition at barrier endpoints rather than sampling a few rays. */
export function sweptProbes(from, to, width, height, segments = []) {
  const epsilon = 0.01;
  const minX = Math.min(from.x, to.x) + epsilon, minY = Math.min(from.y, to.y) + epsilon;
  const maxX = Math.max(from.x, to.x) + width - epsilon, maxY = Math.max(from.y, to.y) + height - epsilon;
  const xs = [minX, maxX], ys = [minY, maxY];
  for (const [x1,y1,x2,y2] of segments) {
    if (Math.max(x1,x2) < minX || Math.min(x1,x2) > maxX || Math.max(y1,y2) < minY || Math.min(y1,y2) > maxY) continue;
    for (const x of [x1,x2]) if (x > minX && x < maxX) xs.push(x);
    for (const y of [y1,y2]) if (y > minY && y < maxY) ys.push(y);
  }
  const partition = values => {
    const ordered = [...new Set(values)].sort((a,b) => a-b), result = [...ordered];
    for (let i = 1; i < ordered.length; i++) result.push((ordered[i-1]+ordered[i])/2);
    return result;
  };
  const horizontal = partition(ys).map(y => [{x:minX,y}, {x:maxX,y}]);
  const vertical = partition(xs).map(x => [{x,y:minY}, {x,y:maxY}]);
  if (to.x < from.x) horizontal.forEach(ray => ray.reverse());
  if (to.y < from.y) vertical.forEach(ray => ray.reverse());
  return [...horizontal, ...vertical];
}
