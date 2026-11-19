import { YEARS, rowKeys, PRINCIPLES } from "../rules/settlement-records.mjs";
import { PHASES, PARTY_SLOTS } from "../rules/constants.mjs";
import { common, schema, count, text, slots, bool, number } from "./fields.mjs";
export class SettlementData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {...common(),
      departingSurvivalGain: count(), portcullisKey: bool(),
      lostSettlements: schema(Object.fromEntries(rowKeys(20).map(key=>[key,bool()]))),
      principles: schema(Object.fromEntries(Object.keys(PRINCIPLES).map(key=>[key,text({blank:true})]))),
      timeline: schema(Object.fromEntries(YEARS.map(key=>[key,schema({active:bool(),storyState:number(0,{min:0,max:2}),
        ...Object.fromEntries(['settlementEvents','storyEvents','developments','births','deaths','monster'].map(field=>[field,text({blank:true})]))})]))),
      milestones: schema(Object.fromEntries(rowKeys(10).map((key,i)=>[key,schema({checked:bool(),...(i>=5?{label:text({blank:true})}:{})})]))),
      monsterTracking: schema(Object.fromEntries(['quarry','nemesis'].map(group=>[group,schema(Object.fromEntries(rowKeys(10).map((key,i)=>[key,schema({enabled:bool(),...(i>=3?{name:text({blank:true})}:{}),levels:schema({level1:bool(),level2:bool(),level3:bool()})})])))]))), lanternYear: count(), population: count(), endeavors: count(), survivalLimit: count(1),
      campaign: schema({phase: text({initial: "settlement", choices: PHASES}), party: slots(PARTY_SLOTS), quarryId: text(),
        hunt: schema({survivorPosition: count(), quarryPosition: count()}), showdownSceneId: text()})};
  }
}
