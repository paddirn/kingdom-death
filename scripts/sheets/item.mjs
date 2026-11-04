import { enhanceNumbers } from "../ui/numbers.mjs";
const { api, sheets } = foundry.applications;
export class KDMItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  static DEFAULT_OPTIONS = {classes: ["kingdom-death", "kdm-sheet"], tag: "form",
    position: {width: 540, height: 620}, form: {submitOnChange: false, closeOnSubmit: false}};
  static PARTS = {body: {template: "systems/kingdom-death/templates/item.hbs"}};
  async _onRender(context, options) {
    await super._onRender(context, options);
    enhanceNumbers(this.element, this.isEditable, this.item.system);
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {...context, item: this.item, system: this.item.system, editable: this.isEditable,
      isGear: this.item.type === "gear", isResource: this.item.type === "resource",
      sides: this.item.type === "gear" ? Object.entries(this.item.system.affinities).map(([side,color]) => ({side,
        colors: ["none","red","green","blue"].map(value => ({value, selected: value === color}))})) : []};
  }
}
