/** Normal writes reject invalid counts; only legacy source migration clamps. */
export function validateBleeding(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 5)
    throw new Error('Bleeding must be a whole number from 0 through 5.');
  return value;
}
export function migrateBleeding(source) {
  if (source.bleeding === undefined) return source;
  const value = source.bleeding;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5) return source;
  source.legacyBleeding ||= String(value);
  const numeric = Number(value);
  source.bleeding = Number.isFinite(numeric) ? Math.min(5,Math.max(0,Math.trunc(numeric))) : 0;
  if (source.bleeding === 5) source.dead = true;
  return source;
}
