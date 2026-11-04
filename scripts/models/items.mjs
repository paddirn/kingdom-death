import { fields, common, schema, count, text, number } from "./fields.mjs";
export class BasicItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() { return {...common(), source: text(), keywords: text()}; }
}
export class ResourceData extends BasicItemData {
  static defineSchema() { return {...super.defineSchema(), quantity: count(1)}; }
}
export class GearData extends BasicItemData {
  static defineSchema() {
    return {...super.defineSchema(), attack: schema({speed: count(), accuracy: count(), strength: number()}),
      affinities: schema(Object.fromEntries(["top", "right", "bottom", "left"].map(side => [side,
        new fields.StringField({required: true, initial: "none", choices: ["none", "red", "green", "blue"]})])))};
  }
}
export const itemModels = {gear: GearData, resource: ResourceData, fightingArt: BasicItemData,
  disorder: BasicItemData, ability: BasicItemData, innovation: BasicItemData, settlementLocation: BasicItemData};
