import { common, schema, count, number, text } from "./fields.mjs";
export class MonsterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {...common(), level: count(1), movement: count(), toughness: count(), wounds: count(),
      accuracy: number(), damage: number(), speed: number(), luck: number(), evasion: number(),
      decks: schema({ai: text(), hitLocation: text()})};
  }
}
