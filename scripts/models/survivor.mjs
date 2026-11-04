import { ATTRIBUTES, LOCATIONS, SLOTS } from "../rules/constants.mjs";
import { common, schema, count, number, bool, slots, text } from "./fields.mjs";
export class SurvivorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {...common(), sex: text({blank: true, choices: ["", "M", "F"]}), cannotSpendSurvival: bool(), cannotUseFightingArts: bool(),
      impairments: text({blank: true}), skipNextHunt: bool(), oncePerLifetime: text({blank: true}), rerollUsed: bool(),
      ageMilestones: schema({age1: bool(), age2: bool(), age3: bool(), age4: bool()}),
      weaponProficiency: schema({type: text({blank: true}), value: count(), specialist: bool(), master: bool()}), attributes: schema(Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, number(key === "movement" ? 5 : 0)]))),
      survival: schema({value: count(), limit: count(1)}), insanity: count(), brainInjury: bool(),
      bleeding: count(), huntXP: count(), understanding: count(), courage: count(),
      retired: bool(), dead: bool(), knockedDown: bool(),
      locations: schema(Object.fromEntries(Object.keys(LOCATIONS).map(key => [key, schema({armor: count(), ...(key === "head" ? {} : {light: bool()}), heavy: bool()})]))),
      gearGrid: slots(SLOTS)};
  }
}
