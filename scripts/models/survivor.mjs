import { clampSurvival, validateSurvival } from "../rules/survival.mjs";
import { ATTRIBUTES, LOCATIONS, SLOTS } from "../rules/constants.mjs";
import { fields, common, schema, count, number, bool, slots, text } from "./fields.mjs";
export class SurvivorData extends foundry.abstract.TypeDataModel {
  static _cleanData(data, options, state) {
    super._cleanData(data, options, state);
    // Never fill missing keys on a partial update: the merged source is cleaned again.
    if (data.survival?.value !== undefined && data.survival?.limit !== undefined) {
      Object.assign(data.survival, clampSurvival(data.survival));
    }
    return data;
  }
  static validateJoint(data) {
    super.validateJoint(data);
    if (data.survival) validateSurvival(data.survival);
  }
  static defineSchema() {
    return {...common(),
      proficiencyUuid: text({blank: true}), additionalProficiencies: new fields.ArrayField(text({blank:false}), {initial:[]}),
      family: schema({parents: schema({parent1: text({blank:true}), parent2: text({blank:true})}), children: new fields.ArrayField(text({blank:false}), {initial: []})}),
      customTokens: schema(Object.fromEntries(Array.from({length:5}, (_,i)=>[`token${i+1}`, schema({label:text({blank:true,initial:"_ tokens"}),value:count()})]))), survivalActions: schema({dodge: bool(), encourage: bool(), surge: bool(), dash: bool(), endure: bool()}),
      courageChoice: text({blank: true, choices: ["", "stalwart", "prepared", "matchmaker"]}),
      understandingChoice: text({blank: true, choices: ["", "analyze", "explore", "tinker"]}), sex: text({blank: true, choices: ["", "M", "F"]}), cannotSpendSurvival: bool(), cannotUseFightingArts: bool(),
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
