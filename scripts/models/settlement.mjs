import { PHASES, PARTY_SLOTS } from "../rules/constants.mjs";
import { common, schema, count, text, slots } from "./fields.mjs";
export class SettlementData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {...common(), lanternYear: count(), population: count(), endeavors: count(), survivalLimit: count(1),
      campaign: schema({phase: text({initial: "settlement", choices: PHASES}), party: slots(PARTY_SLOTS), quarryId: text(),
        hunt: schema({survivorPosition: count(), quarryPosition: count()}), showdownSceneId: text()})};
  }
}
