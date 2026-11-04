/** Normalize the complete Survival pair without changing unrelated Survivor data. */
export function clampSurvival({value = 0, limit = 1} = {}) {
  const count = n => Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0;
  limit = count(limit);
  return {value: Math.min(count(value), limit), limit};
}
export function validateSurvival({value, limit}) {
  if (![value, limit].every(n => Number.isInteger(n) && n >= 0) || value > limit) {
    throw new Error('Current Survival must be between zero and Survival Limit.');
  }
}
