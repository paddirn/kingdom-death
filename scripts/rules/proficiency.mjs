export function proficiencyName(type, rank = "specialization") {
  return `${String(type ?? "").trim() || "Proficiency"} (${rank === "mastery" ? "mastery" : "specialization"})`;
}
export function keywords(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).map(v => String(v).trim()).filter(v => {
    const key = v.toLocaleLowerCase();
    if (!v || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export async function resolveProficiency(uuid, resolve = fromUuid) {
  if (!uuid) return null;
  let item;
  try { item = await resolve(uuid); } catch { /* Invalid or inaccessible UUID. */ }
  if (!item || item.documentName !== "Item" || item.type !== "proficiency" || !item.testUserPermission(game.user, "OBSERVER")) {
    throw new Error("Choose an accessible Proficiency Item (world, owned, or compendium UUID).");
  }
  return item;
}
