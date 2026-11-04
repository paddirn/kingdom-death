import { proficiencyName, keywords } from "../rules/proficiency.mjs";
/** Derive names at the document boundary: covers sheets, macros and imports without update loops. */
export class KDMItem extends foundry.documents.Item {
  async _preCreate(data, options, user) {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;
    this.updateSource({"system.keywords":keywords(this.system.keywords), ...(this.type === "proficiency" ? {name:proficiencyName(this.system.type,this.system.rank)} : {})});
  }
  async _preUpdate(changes, options, user) {
    const result = await super._preUpdate(changes, options, user);
    if (result === false) return false;
    const expanded = foundry.utils.expandObject(changes);
    if (this.type === "proficiency") changes.name = proficiencyName(expanded.system?.type ?? this.system.type, expanded.system?.rank ?? this.system.rank);
    if (expanded.system && Object.hasOwn(expanded.system,"keywords")) {
      if (changes.system) changes.system.keywords = keywords(expanded.system.keywords);
      else changes["system.keywords"] = keywords(expanded.system.keywords);
    }
  }
}
