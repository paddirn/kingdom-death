import { SLOTS } from "./constants.mjs";
/** Coordinates are fixed; gear rotation is deliberately not supported. */
export function gridCells(assignments, items) {
  const gear = new Map(items.filter(i => i.type === "gear").map(i => [i.id, i]));
  return SLOTS.map((key, index) => ({key, index, row: Math.floor(index / 3), column: index % 3,
    itemId: assignments[key] || "", item: gear.get(assignments[key]) ?? null,
    missing: Boolean(assignments[key] && !gear.has(assignments[key]))}));
}
export function validateGrid(assignments, items) {
  const ids = new Set(items.filter(i => i.type === "gear").map(i => i.id));
  const used = new Set();
  for (const key of SLOTS) {
    const id = assignments[key];
    if (!id) continue;
    if (!ids.has(id)) throw new Error("A grid slot refers to missing gear. Clear or replace that slot.");
    if (used.has(id)) throw new Error("The same gear item cannot occupy two slots. Create another item for a second copy.");
    used.add(id);
  }
  return true;
}
export function neighbors(index) {
  if (!Number.isInteger(index) || index < 0 || index > 8) throw new RangeError("Grid index must be 0–8.");
  const row = Math.floor(index / 3), col = index % 3;
  return [index - 3, index + 3, ...(col ? [index - 1] : []), ...(col < 2 ? [index + 1] : [])]
    .filter(i => i >= 0 && i < 9 && Math.abs(Math.floor(i / 3) - row) <= 1);
}
