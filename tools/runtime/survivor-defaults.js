// Paste into a Script Macro in a kingdom-death world on Foundry 14.365.
// Uses the REAL registered Foundry model; creates no persistent documents.
if (game.system.id !== "kingdom-death" || game.version !== "14.365") {
  throw new Error("Run this regression on kingdom-death / Foundry 14.365.");
}
const Model = CONFIG.Actor.dataModels.survivor;
for (const sex of [undefined, "", "M", "F"]) {
  const actor = new foundry.documents.Actor({name: "Default validation regression", type: "survivor"});
  const model = new Model(sex === undefined ? {} : {sex}, {parent: actor});
  if (model.validate({strict: true}) === false || model.invalid) throw new Error("Survivor defaults failed validation");
  if (Object.values(model.survivalActions).some(value => value !== false) || model.courageChoice !== "" || model.understandingChoice !== "") throw new Error("New Survivor refinement defaults changed");
  if (model.sex !== (sex ?? "")) throw new Error("Sex default/choice changed");
  for (const value of [model.impairments, model.oncePerLifetime, model.weaponProficiency.type]) {
    if (value !== "") throw new Error("Expected blank optional text default");
  }
}
ui.notifications.info("Survivor default construction and validation passed on Foundry 14.365.");
const fresh = new Model({}, {parent: new foundry.documents.Actor({name:"New fields",type:"survivor"})});
if (fresh.proficiencyUuid !== "" || fresh.family.children.length || fresh.family.parents.parent1 !== "") throw new Error("Reference defaults invalid");
if (Object.values(fresh.customTokens).some(t=>t.label !== "_ tokens" || t.value !== 0)) throw new Error("Token defaults invalid");
const proficiency = new CONFIG.Item.documentClass({name:"Proficiency",type:"proficiency"});
if (proficiency.validate({strict:true}) === false || proficiency.system.invalid) throw new Error("Proficiency default validation failed");
if (proficiency.system.type !== "" || proficiency.system.rank !== "specialization" || proficiency.system.keywords.length) throw new Error("Proficiency defaults changed");
ui.notifications.info("Family, token and Proficiency defaults passed on Foundry 14.365.");
