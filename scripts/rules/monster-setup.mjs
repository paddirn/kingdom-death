export const COLUMNS = 22;
export const ROWS = 16;
export const CELL_COUNT = COLUMNS * ROWS;
export const COLORS = ['#C6C7C6','#63C6D7','#D87655','#9FC78B','#79795A'];
export const COLOR_NAMES = ['Light gray','Cyan','Red-orange','Light green','Green-brown'];
export function validCells(cells) {
  return Array.isArray(cells) && cells.length === CELL_COUNT &&
    cells.every(value => Number.isInteger(value) && value >= 0 && value <= 4);
}
export function normalizeCells(cells) {
  return Array.from({length:CELL_COUNT}, (_,index) => {
    const value = Array.isArray(cells) ? cells[index] : 0;
    return Number.isInteger(value) && value >= 0 && value <= 4 ? value : 0;
  });
}
export function cycleCell(value) { return (value + 1) % COLORS.length; }
export function cellLabel(index, value, legend) {
  const name = value ? legend?.[`color${value}`] || COLOR_NAMES[value] : COLOR_NAMES[0];
  return `Row ${Math.floor(index / COLUMNS) + 1}, column ${index % COLUMNS + 1}: ${name}`;
}
export function mergeCells(current, edits) {
  const cells = normalizeCells(current);
  for (const [index,value] of edits) cells[index] = value;
  return cells;
}
