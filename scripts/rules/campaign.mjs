import { PHASES, PARTY_SLOTS } from "./constants.mjs";
export function validateCampaign(campaign, actors) {
  if (!PHASES.includes(campaign.phase)) throw new Error("Unknown campaign phase.");
  const byId = new Map(actors.map(a => [a.id, a]));
  const ids = PARTY_SLOTS.map(key => campaign.party[key]).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error("Select each departing survivor only once.");
  for (const id of ids) if (byId.get(id)?.type !== "survivor") throw new Error("A selected survivor no longer exists. Clear or replace it.");
  if (campaign.quarryId && byId.get(campaign.quarryId)?.type !== "monster") throw new Error("The selected quarry no longer exists. Clear or replace it.");
  return true;
}
